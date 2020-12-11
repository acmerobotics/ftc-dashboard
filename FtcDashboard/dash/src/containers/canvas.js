// align coordinate to the nearest pixel, offset by a half pixel
// this helps with drawing thin lines; e.g., if a line of width 1px
// is drawn on an integer coordinate, it will be 2px wide
// x is assumed to be in *device* pixels
function alignCoord(x, scaling) {
  const roundX = Math.round(x * scaling);
  return (roundX + 0.5 * Math.sign(x - roundX)) / scaling;
}

function arrToDOMMatrix(arr) {
  return window.DOMMatrix.fromFloat64Array(Float64Array.from(arr));
}

CanvasRenderingContext2D.prototype.getScalingFactors = function () {
  let transform;
  if (typeof this.getTransform === 'function') {
    transform = this.getTransform();
  } else if (typeof this.mozCurrentTransform !== 'undefined') {
    transform = arrToDOMMatrix(this.mozCurrentTransform);
  } else {
    throw new Error('unable to find canvas transform');
  }

  const { a, b, c, d } = transform;
  const scalingX = Math.sqrt(a * a + c * c);
  const scalingY = Math.sqrt(b * b + d * d);

  return {
    scalingX,
    scalingY,
  };
};

CanvasRenderingContext2D.prototype.fineMoveTo = function (x, y) {
  const { scalingX, scalingY } = this.getScalingFactors();
  this.moveTo(alignCoord(x, scalingX), alignCoord(y, scalingY));
};

CanvasRenderingContext2D.prototype.fineLineTo = function (x, y) {
  const { scalingX, scalingY } = this.getScalingFactors();
  this.lineTo(alignCoord(x, scalingX), alignCoord(y, scalingY));
};
