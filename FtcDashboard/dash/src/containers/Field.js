import { cloneDeep } from 'lodash';
import './canvas';
import fieldImageName from '../assets/field.png';

// this is a bit of a hack bit it'll have to do
// it's much better than sticking field renders in requestAnimationFrame()
const fieldImage = new Image();
const fieldsToRender = [];
let fieldLoaded = false;
fieldImage.onload = function () {
  fieldLoaded = true;
  fieldsToRender.forEach((field) => field.render());
};
fieldImage.src = fieldImageName;

// all dimensions in this file are *CSS* pixels unless otherwise stated
const DEFAULT_OPTIONS = {
  padding: 15,
  alpha: 0.25,
  fieldSize: 12 * 12, // inches
  splineSamples: 250,
  gridLineWidth: 1, // device pixels
  gridLineColor: 'rgb(120, 120, 120)',
};

export default class Field {
  constructor(canvas, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.options = cloneDeep(DEFAULT_OPTIONS);
    Object.assign(this.options, options || {});

    this.overlay = {
      ops: [],
    };
  }

  setOverlay(overlay) {
    this.overlay = overlay;
  }

  render() {
    // eslint-disable-next-line
    this.canvas.width = this.canvas.width; // clears the canvas

    // scale the canvas to facilitate the use of CSS pixels
    this.ctx.scale(devicePixelRatio, devicePixelRatio);

    const width = this.canvas.width / devicePixelRatio;
    const height = this.canvas.height / devicePixelRatio;
    const smallerDim = width < height ? width : height;
    const fieldSize = smallerDim - 2 * this.options.padding;

    if (!fieldLoaded && fieldsToRender.indexOf(this) === -1) {
      fieldsToRender.push(this);
    }

    this.renderField(
      (width - fieldSize) / 2,
      (height - fieldSize) / 2,
      fieldSize,
      fieldSize,
    );
  }

  renderField(x, y, width, height) {
    this.ctx.save();
    this.ctx.globalAlpha = this.options.alpha;
    this.ctx.drawImage(fieldImage, x, y, width, height);
    this.ctx.restore();

    this.renderGridLines(x, y, width, height, 7, 7);
    this.renderOverlay(x, y, width, height);
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

  renderOverlay(x, y, width, height) {
    const o = this.options;

    this.ctx.save();
    this.ctx.translate(x + width / 2, y + height / 2);
    this.ctx.scale(width / o.fieldSize, -height / o.fieldSize);
    this.ctx.rotate(Math.PI / 2);

    this.ctx.lineCap = 'butt';

    this.overlay.ops.forEach((op) => {
      switch (op.type) {
        case 'fill':
          this.ctx.fillStyle = op.color;
          break;
        case 'stroke':
          this.ctx.strokeStyle = op.color;
          break;
        case 'strokeWidth':
          this.ctx.lineWidth = op.width;
          break;
        case 'circle':
          this.ctx.beginPath();
          this.ctx.arc(op.x, op.y, op.radius, 0, 2 * Math.PI);

          if (op.stroke) {
            this.ctx.stroke();
          } else {
            this.ctx.fill();
          }
          break;
        case 'polygon': {
          this.ctx.beginPath();
          const { xPoints, yPoints, stroke } = op;
          this.ctx.fineMoveTo(xPoints[0], yPoints[0]);
          for (let i = 1; i < xPoints.length; i++) {
            this.ctx.fineLineTo(xPoints[i], yPoints[i]);
          }
          this.ctx.closePath();

          if (stroke) {
            this.ctx.stroke();
          } else {
            this.ctx.fill();
          }
          break;
        }
        case 'polyline': {
          this.ctx.beginPath();
          const { xPoints, yPoints } = op;
          this.ctx.fineMoveTo(xPoints[0], yPoints[0]);
          for (let i = 1; i < xPoints.length; i++) {
            this.ctx.fineLineTo(xPoints[i], yPoints[i]);
          }
          this.ctx.stroke();
          break;
        }
        case 'spline': {
          this.ctx.beginPath();
          const { ax, bx, cx, dx, ex, fx, ay, by, cy, dy, ey, fy } = op;
          this.ctx.fineMoveTo(fx, fy);
          for (let i = 0; i <= o.splineSamples; i++) {
            const t = i / o.splineSamples;
            const sx =
              (ax * t + bx) * (t * t * t * t) +
              cx * (t * t * t) +
              dx * (t * t) +
              ex * t +
              fx;
            const sy =
              (ay * t + by) * (t * t * t * t) +
              cy * (t * t * t) +
              dy * (t * t) +
              ey * t +
              fy;

            this.ctx.lineTo(sx, sy);
          }
          this.ctx.stroke();
          break;
        }
        default:
          throw new Error(`unknown operation: ${op.type}`);
      }
    });

    this.ctx.restore();
  }
}
