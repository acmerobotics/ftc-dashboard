import { cloneDeep } from 'lodash';
import './canvas';

// all dimensions in this file are *CSS* pixels unless otherwise stated
export const DEFAULT_OPTIONS = {
  windowMs: 5000,
  colors: ['#2979ff', '#dd2c00', '#4caf50', '#7c4dff', '#ffa000'],
  lineWidth: 2,
  padding: 15,
  keySpacing: 4,
  keyLineLength: 12,
  gridLineWidth: 1, // device pixels
  gridLineColor: 'rgb(120, 120, 120)',
  fontSize: 14,
  textColor: 'rgb(50, 50, 50)',
  maxTicks: 7,
};

function niceNum(range, round) {
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / Math.pow(10, exponent);
  let niceFraction;
  if (round) {
    if (fraction < 1.5) {
      niceFraction = 1;
    } else if (fraction < 3) {
      niceFraction = 2;
    } else if (fraction < 7) {
      niceFraction = 5;
    } else {
      niceFraction = 10;
    }
  } else if (fraction <= 1) {
    niceFraction = 1;
  } else if (fraction <= 2) {
    niceFraction = 2;
  } else if (fraction <= 5) {
    niceFraction = 5;
  } else {
    niceFraction = 10;
  }
  return niceFraction * Math.pow(10, exponent);
}

// interesting algorithm (see http://erison.blogspot.nl/2011/07/algorithm-for-optimal-scaling-on-chart.html)
function getAxisScaling(min, max, maxTicks) {
  const range = niceNum(max - min, false);
  const tickSpacing = niceNum(range / (maxTicks - 1), true);
  const niceMin = Math.floor(min / tickSpacing) * tickSpacing;
  const niceMax = (Math.floor(max / tickSpacing) + 1) * tickSpacing;
  return {
    min: niceMin,
    max: niceMax,
    spacing: tickSpacing,
  };
}

// shamelessly stolen from https://github.com/chartjs/Chart.js/blob/master/src/core/core.ticks.js
function formatTicks(tickValue, ticks) {
  // If we have lots of ticks, don't use the ones
  let delta = ticks.length > 3 ? ticks[2] - ticks[1] : ticks[1] - ticks[0];

  // If we have a number like 2.5 as the delta, figure out how many decimal places we need
  if (Math.abs(delta) > 1) {
    if (tickValue !== Math.floor(tickValue)) {
      // not an integer
      delta = tickValue - Math.floor(tickValue);
    }
  }

  const logDelta = Math.log10(Math.abs(delta));
  let tickString = '';

  if (tickValue !== 0) {
    let numDecimal = -1 * Math.floor(logDelta);
    numDecimal = Math.max(Math.min(numDecimal, 20), 0); // toFixed has a max of 20 decimal places
    tickString = tickValue.toFixed(numDecimal);
  } else {
    tickString = '0'; // never show decimal places for 0
  }

  return tickString;
}

function getTicks(axis) {
  // get tick array
  const ticks = [];
  for (let i = axis.min; i <= axis.max; i += axis.spacing) {
    ticks.push(i);
  }

  // generate strings
  const tickStrings = [];
  for (let i = 0; i < ticks.length; i++) {
    const s = formatTicks(ticks[i], ticks);
    tickStrings.push(s);
  }

  return tickStrings;
}

function scale(value, fromLow, fromHigh, toLow, toHigh) {
  const frac = (toHigh - toLow) / (fromHigh - fromLow);
  return toLow + frac * (value - fromLow);
}

export default class Graph {
  constructor(canvas, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.options = cloneDeep(DEFAULT_OPTIONS);
    Object.assign(this.options, options || {});

    this.hasGraphableContent = false;

    this.clear();
  }

  clear() {
    this.time = [];
    this.datasets = [];
    this.lastSampleTime = 0;

    this.hasGraphableContent = false;
  }

  addSample(sample) {
    if (this.lastSampleTime === 0) {
      this.lastSimTime = Date.now() + 250;
      this.time.push(this.lastSimTime);
      let color = 0;
      for (let i = 0; i < sample.length; i++) {
        if (sample[i].name === 'time') {
          this.lastSampleTime = sample[i].value;
        } else {
          this.datasets.push({
            name: sample[i].name,
            data: [sample[i].value],
            color: this.options.colors[color % this.options.colors.length],
          });
          color++;
        }
      }
    } else {
      for (let i = 0; i < sample.length; i++) {
        if (sample[i].name === 'time') {
          this.lastSimTime += sample[i].value - this.lastSampleTime;
          this.time.push(this.lastSimTime);
          this.lastSampleTime = sample[i].value;
        } else {
          for (let j = 0; j < this.datasets.length; j++) {
            if (sample[i].name === this.datasets[j].name) {
              this.datasets[j].data.push(sample[i].value);
            }
          }
        }
      }
    }
  }

  getAxis() {
    // get y-axis scaling
    let min = Number.MAX_VALUE;
    let max = Number.MIN_VALUE;
    for (let i = 0; i < this.datasets.length; i++) {
      for (let j = 0; j < this.datasets[i].data.length; j++) {
        const val = this.datasets[i].data[j];
        if (val > max) {
          max = val;
        }
        if (val < min) {
          min = val;
        }
      }
    }
    if (Math.abs(min - max) < 1e-6) {
      return getAxisScaling(min - 1, max + 1, this.options.maxTicks);
    }
    return getAxisScaling(min, max, this.options.maxTicks);
  }

  render() {
    const o = this.options;

    // eslint-disable-next-line
    this.canvas.width = this.canvas.width; // clears the canvas

    // scale the canvas to facilitate the use of CSS pixels
    this.ctx.scale(devicePixelRatio, devicePixelRatio);

    this.ctx.font = `${o.fontSize}px "Roboto", sans-serif`;
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = 'left';
    this.ctx.lineWidth = o.lineWidth / devicePixelRatio;

    const width = this.canvas.width / devicePixelRatio;
    const height = this.canvas.height / devicePixelRatio;

    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, width, height);

    const keyHeight = this.renderKey(0, 0, width);
    this.renderGraph(0, keyHeight, width, height - keyHeight);
  }

  renderKey(x, y, width) {
    const o = this.options;

    this.ctx.save();

    const numSets = this.datasets.length;
    const height = numSets * o.fontSize + (numSets - 1) * o.keySpacing;
    for (let i = 0; i < numSets; i++) {
      const lineY = y + i * (o.fontSize + o.keySpacing) + o.fontSize / 2;
      const name = this.datasets[i].name;
      const color = this.datasets[i].color;
      const lineWidth =
        this.ctx.measureText(name).width + o.keyLineLength + o.keySpacing;
      const lineX = x + (width - lineWidth) / 2;

      this.ctx.strokeStyle = color;
      this.ctx.beginPath();
      this.ctx.fineMoveTo(lineX, lineY);
      this.ctx.fineLineTo(lineX + o.keyLineLength, lineY);
      this.ctx.stroke();

      this.ctx.fillStyle = o.textColor;
      this.ctx.fillText(name, lineX + o.keyLineLength + o.keySpacing, lineY);
    }

    this.ctx.restore();

    return height;
  }

  renderGraph(x, y, width, height) {
    const o = this.options;

    if (this.datasets.length === 0 || this.datasets[0].data.length === 0) {
      this.hasGraphableContent = false;

      return;
    }

    this.hasGraphableContent = true;

    // remove old points
    const now = Date.now();
    while (now - this.time[0] > o.windowMs + 250) {
      this.time.shift();
      for (let i = 0; i < this.datasets.length; i++) {
        this.datasets[i].data.shift();
      }
    }

    const graphHeight = height - 2 * o.padding;

    const axis = this.getAxis();
    const ticks = getTicks(axis);
    const axisWidth = this.renderAxisLabels(
      x + o.padding,
      y + o.padding,
      graphHeight,
      ticks,
    );

    const graphWidth = width - axisWidth - 3 * o.padding;

    this.renderGridLines(
      x + axisWidth + 2 * o.padding,
      y + o.padding,
      graphWidth,
      graphHeight,
      5,
      ticks.length,
    );

    this.renderGraphLines(
      x + axisWidth + 2 * o.padding,
      y + o.padding,
      graphWidth,
      graphHeight,
      axis,
    );
  }

  renderAxisLabels(x, y, height, ticks) {
    this.ctx.save();

    let width = 0;
    for (let i = 0; i < ticks.length; i++) {
      const textWidth = this.ctx.measureText(ticks[i]).width;
      if (textWidth > width) {
        width = textWidth;
      }
    }

    // draw axis labels
    this.ctx.textAlign = 'right';
    this.ctx.fillStyle = this.options.textColor;

    const vertSpacing = height / (ticks.length - 1);
    x += width;
    for (let i = 0; i < ticks.length; i++) {
      this.ctx.fillText(ticks[i], x, y + (ticks.length - i - 1) * vertSpacing);
    }

    this.ctx.restore();

    return width;
  }

  renderGridLines(x, y, width, height, numTicksX, numTicksY) {
    this.ctx.save();

    this.ctx.strokeStyle = this.options.gridLineColor;
    this.ctx.lineWidth = this.options.gridLineWidth / devicePixelRatio;

    const horSpacing = width / (numTicksX - 1);
    const vertSpacing = height / (numTicksY - 1);

    for (let i = 0; i < numTicksX; i++) {
      const lineX = x + horSpacing * i;
      this.ctx.beginPath();
      this.ctx.fineMoveTo(lineX, y);
      this.ctx.fineLineTo(lineX, y + height);
      this.ctx.stroke();
    }

    for (let i = 0; i < numTicksY; i++) {
      const lineY = y + vertSpacing * i;
      this.ctx.beginPath();
      this.ctx.fineMoveTo(x, lineY);
      this.ctx.fineLineTo(x + width, lineY);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  renderGraphLines(x, y, width, height, axis) {
    const o = this.options;
    const now = Date.now();

    this.ctx.lineWidth = o.lineWidth;

    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rect(0, 0, width, height);
    this.ctx.clip();

    // draw data lines
    // scaling is used instead of transform because of the non-uniform stretching warps the plot line
    this.ctx.beginPath();
    for (let i = 0; i < this.datasets.length; i++) {
      const d = this.datasets[i];
      this.ctx.beginPath();
      this.ctx.strokeStyle = d.color;
      this.ctx.fineMoveTo(
        scale(this.time[0] - now + o.windowMs, 0, o.windowMs, 0, width),
        scale(d.data[0], axis.min, axis.max, height, 0),
      );
      for (let j = 1; j < d.data.length; j++) {
        this.ctx.fineLineTo(
          scale(this.time[j] - now + o.windowMs, 0, o.windowMs, 0, width),
          scale(d.data[j], axis.min, axis.max, height, 0),
        );
      }
      this.ctx.stroke();
    }

    this.ctx.restore();
  }
}
