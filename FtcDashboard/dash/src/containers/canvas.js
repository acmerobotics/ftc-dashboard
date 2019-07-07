// align coordinate to the nearest pixel, offset by a half pixel
// this helps with drawing thin lines; e.g., if a line of width 1px
// is drawn on an integer coordinate, it will be 2px wide
// x is assumed to be in *device* pixels
function alignCoord(x, scaling) {
  const roundX = Math.round(x * scaling);
  return (roundX + 0.5 * Math.sign(x - roundX)) / scaling;
}

CanvasRenderingContext2D.prototype.getScalingFactors = function() {
  const transform = this.currentTransform || this.mozCurrentTransform;
  const scalingX = Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]);
  const scalingY = Math.sqrt(transform[2] * transform[2] + transform[3] * transform[3]);
  return {
    scalingX, 
    scalingY
  };
};

CanvasRenderingContext2D.prototype.fineMoveTo = function(x, y) {
  const { scalingX, scalingY } = this.getScalingFactors();
  this.moveTo(alignCoord(x, scalingX), alignCoord(y, scalingY));
};

CanvasRenderingContext2D.prototype.fineLineTo = function(x, y) {
  const { scalingX, scalingY } = this.getScalingFactors();
  this.lineTo(alignCoord(x, scalingX), alignCoord(y, scalingY));
};