const DEFAULT_OPTIONS = {
  colors: [
    '#2979ff',
    '#dd2c00',
    '#4caf50',
    '#7c4dff',
    '#ffa000',
  ],
  lineWidth: 2,
  durationMs: 5000,
  padding: 15,
  keySpacing: 4,
  keyLineWidth: 12,
  fontSize: 14,
  textColor: 'rgb(50, 50, 50)',
  gridLineColor: 'rgb(120, 120, 120)',
  smoothing: 0,
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
function getAxisScaling(min, max) {
  const maxTicks = 7;
  const range = niceNum(max - min, false);
  const tickSpacing = niceNum(range / (maxTicks - 1), true);
  const niceMin = Math.floor(min / tickSpacing) * tickSpacing;
  const niceMax = (Math.floor(max / tickSpacing) + 1) * tickSpacing;
  return [niceMin, niceMax, tickSpacing];
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
  for (let i = axis[0]; i <= axis[1]; i += axis[2]) {
    ticks.push(i);
  }

  // generate strings
  const tickStrings = [];
  for (let i = 0; i < ticks.length; i += 1) {
    const s = formatTicks(ticks[i], ticks);
    tickStrings.push(s);
  }

  return tickStrings;
}

function map(value, fromLow, fromHigh, toLow, toHigh) {
  const frac = (value - fromLow) / (fromHigh - fromLow);
  return toLow + frac * (toHigh - toLow);
}

export default class Graph {
  constructor(canvas, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = DEFAULT_OPTIONS;
    Object.assign(this.options, options || {});
    this.clear();
  }

  clear() {
    this.time = [];
    this.datasets = [];
    this.lastDataTime = 0;
  }

  addData(data) {
    if (this.lastDataTime === 0) {
      this.lastSimTime = Date.now() + 250;
      this.time.push(this.lastSimTime);
      let color = 0;
      for (let i = 0; i < data.length; i += 1) {
        if (data[i].name === 'time') {
          this.lastDataTime = data[i].value;
        } else {
          this.datasets.push({
            name: data[i].name,
            data: [data[i].value],
            color: this.options.colors[color % data.length],
          });
          color += 1;
        }
      }
    } else {
      for (let i = 0; i < data.length; i += 1) {
        if (data[i].name === 'time') {
          this.lastSimTime += (data[i].value - this.lastDataTime);
          this.time.push(this.lastSimTime);
          this.lastDataTime = data[i].value;
        } else {
          for (let j = 0; j < this.datasets.length; j += 1) {
            if (data[i].name === this.datasets[j].name) {
              this.datasets[j].data.push(data[i].value);
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
    for (let i = 0; i < this.datasets.length; i += 1) {
      for (let j = 0; j < this.datasets[i].data.length; j += 1) {
        const val = this.datasets[i].data[j];
        if (val > max) {
          max = val;
        }
        if (val < min) {
          min = val;
        }
      }
    }
    if (Math.abs(min - max) < 1e-100) {
      return getAxisScaling(min - 1, max + 1);
    }
    return getAxisScaling(min, max);
  }

  render(x = 0, y = 0, width = this.canvas.width, height = this.canvas.height) {
    const o = this.options;
    this.canvas.width = this.canvas.width;
    this.ctx.font = `${o.fontSize}px sans-serif`;
    this.ctx.textBaseline = 'middle';
    this.ctx.textAlign = 'left';
    this.ctx.lineWidth = o.lineWidth;
    const keyHeight = this.renderKey(x, y, width);
    this.renderGraph(x, y + keyHeight, width, height - keyHeight);
  }

  renderKey(x, y, width) {
    const o = this.options;
    const numSets = this.datasets.length;
    const height = numSets * o.fontSize + (numSets - 1) * o.keySpacing;
    for (let i = 0; i < numSets; i += 1) {
      const lineY = y + i * (o.fontSize + o.keySpacing) + o.fontSize / 2;
      const name = this.datasets[i].name;
      const color = this.datasets[i].color;
      const lineWidth = this.ctx.measureText(name).width + o.keyLineWidth + o.keySpacing;
      const lineX = x + (width - lineWidth) / 2;

      this.ctx.strokeStyle = color;
      this.ctx.beginPath();
      this.ctx.moveTo(lineX, lineY);
      this.ctx.lineTo(lineX + o.keyLineWidth, lineY);
      this.ctx.stroke();

      this.ctx.fillStyle = o.textColor;
      this.ctx.fillText(name, lineX + o.keyLineWidth + o.keySpacing, lineY);
    }
    return height;
  }

  renderGraph(x, y, width, height) {
    const o = this.options;
    if (this.datasets.length === 0 || this.datasets[0].data.length === 0) {
      return;
    }

    // remove old points
    const now = Date.now();
    while ((now - this.time[0]) > (o.durationMs + 250)) {
      this.time.shift();
      for (let i = 0; i < this.datasets.length; i += 1) {
        this.datasets[i].data.shift();
      }
    }

    const graphHeight = height - 2 * o.padding;

    const axis = this.getAxis();
    const ticks = getTicks(axis);
    const axisWidth = this.renderAxisLabels(x + o.padding, y + o.padding, graphHeight, ticks);

    const graphWidth = width - axisWidth - 3 * o.padding;

    this.renderGridLines(
      x + axisWidth + 2 * o.padding,
      y + o.padding,
      graphWidth,
      graphHeight,
      5,
      ticks.length);

    this.renderGraphLines(
      x + axisWidth + 2 * o.padding,
      y + o.padding,
      graphWidth,
      graphHeight,
      axis);
  }

  renderAxisLabels(x, y, height, ticks) {
    let width = 0;
    for (let i = 0; i < ticks.length; i += 1) {
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
    for (let i = 0; i < ticks.length; i += 1) {
      this.ctx.fillText(ticks[i], x, y + (ticks.length - i - 1) * vertSpacing);
    }

    return width;
  }

  renderGridLines(x, y, width, height, numTicksX, numTicksY) {
    this.ctx.strokeStyle = this.options.gridLineColor;
    this.ctx.lineWidth = 1;

    const horSpacing = width / (numTicksX - 1);
    const vertSpacing = height / (numTicksY - 1);

    for (let i = 0; i < numTicksX; i += 1) {
      const lineX = x + horSpacing * i + 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(lineX, y);
      this.ctx.lineTo(lineX, y + height);
      this.ctx.stroke();
    }

    for (let i = 0; i < numTicksY; i += 1) {
      const lineY = y + vertSpacing * i + 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(x, lineY);
      this.ctx.lineTo(x + width, lineY);
      this.ctx.stroke();
    }
  }

  renderGraphLines(x, y, width, height, axis) {
    const o = this.options;
    const now = Date.now();
    // draw data lines
    this.ctx.lineWidth = o.lineWidth;
    this.ctx.beginPath();
    this.ctx.rect(x, y, width, height);
    this.ctx.clip();
    for (let i = 0; i < this.datasets.length; i += 1) {
      const d = this.datasets[i];
      let value = d.data[0];
      this.ctx.beginPath();
      this.ctx.strokeStyle = d.color;
      this.ctx.moveTo(x + (this.time[0] - now + o.durationMs) * width / o.durationMs,
        y + map(value, axis[0], axis[1], height, 0));
      for (let j = 1; j < d.data.length; j += 1) {
        value = o.smoothing * value + (1 - o.smoothing) * d.data[j];
        this.ctx.lineTo(x + (this.time[j] - now + o.durationMs) * width / o.durationMs,
          y + map(value, axis[0], axis[1], height, 0));
      }
      this.ctx.stroke();
    }
  }
}
