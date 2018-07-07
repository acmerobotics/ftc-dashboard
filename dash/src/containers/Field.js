import fieldImageName from '../assets/field.png';
const fieldImage = new Image();
fieldImage.src = fieldImageName;

const DEFAULT_OPTIONS = {
  padding: 15,
  gridLineColor: 'rgb(120, 120, 120)',
};

function scale(value, fromStart, fromEnd, toStart, toEnd) {
  return toStart + ((toEnd - toStart) * (value - fromStart) / (fromEnd - fromStart));
}

function scalePoint(value, fromStart, fromEnd, toStart, toEnd) {
  return Math.floor(scale(value, fromStart, fromEnd, toStart, toEnd)) + 0.5;
}

export default class Field {
  constructor(canvas, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = DEFAULT_OPTIONS;
    Object.assign(this.options, options || {});
    this.overlay = {
      ops: [],
    };
  }

  render(x, y, width, height) {
    this.canvas.width = this.canvas.width;
    const smallerDim = width < height ? width : height;
    const fieldSize = smallerDim - 2 * this.options.padding;
    this.renderField(
      x + (width - fieldSize) / 2,
      y + (height - fieldSize) / 2,
      fieldSize, fieldSize);
  }

  renderField(x, y, width, height) {
    this.ctx.save();
    this.ctx.globalAlpha = 0.25;
    this.ctx.drawImage(fieldImage, x, y, width, height);
    this.ctx.restore();
    this.renderGridLines(x, y, width, height, 7, 7);
    this.renderOverlay(x, y, width, height);
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

  renderOverlay(x, y, width, height) {
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
        this.ctx.arc(
          scalePoint(op.y, 72, -72, x, width + x),
          scalePoint(op.x, 72, -72, y, height + y),
          scale(op.radius, 0, 72, 0, width / 2), 0, 2 * Math.PI);
        if (op.stroke) {
          this.ctx.stroke();
        } else {
          this.ctx.fill();
        }
        break;
      case 'polygon': {
        this.ctx.beginPath();
        const { xPoints, yPoints, stroke } = op;
        this.ctx.moveTo(scalePoint(yPoints[0], 72, -72, x, width + x),
          scalePoint(xPoints[0], 72, -72, y, height + y));
        for (let i = 1; i < xPoints.length; i += 1) {
          this.ctx.lineTo(scalePoint(yPoints[i], 72, -72, x, width + x),
            scalePoint(xPoints[i], 72, -72, y, height + y));
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
        this.ctx.moveTo(scalePoint(yPoints[0], 72, -72, x, width + x),
          scalePoint(xPoints[0], 72, -72, y, height + y));
        for (let i = 1; i < xPoints.length; i += 1) {
          this.ctx.lineTo(scalePoint(yPoints[i], 72, -72, x, width + x),
            scalePoint(xPoints[i], 72, -72, y, height + y));
        }
        this.ctx.stroke();
        break;
      }
      case 'spline': {
        this.ctx.beginPath();
        const { ax, bx, cx, dx, ex, fx, ay, by, cy, dy, ey, fy } = op;
        this.ctx.moveTo(scalePoint(fy, 72, -72, x, width + x),
          scalePoint(fx, 72, -72, y, height + y));
        for (let t = 0; t <= 1; t += 0.0025) {
          const sx = (ax*t + bx) * (t*t*t*t) + cx * (t*t*t) + dx * (t*t) + ex * t + fx;
          const sy = (ay*t + by) * (t*t*t*t) + cy * (t*t*t) + dy * (t*t) + ey * t + fy;

          this.ctx.lineTo(scalePoint(sy, 72, -72, x, width + x),
            scalePoint(sx, 72, -72, y, height + y));
        }
        this.ctx.stroke();
        break;
      }
      default:
        console.error(`unknown op: ${op.type}`);
        console.error(op);
      }
    });
  }

  setOverlay(overlay) {
    this.overlay = overlay;
  }
}
