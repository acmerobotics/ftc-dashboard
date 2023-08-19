export const RECEIVE_TELEMETRY = 'RECEIVE_TELEMETRY';

export type Telemetry = TelemetryItem[];

type Fill = {
  type: 'fill';
  color: string;
};

type Stroke = {
  type: 'stroke';
  color: string;
};

type StrokeWidth = {
  type: 'strokeWidth';
  width: number;
};

type Circle = {
  type: 'circle';
  x: number;
  y: number;
  radius: number;
  stroke: boolean;
};

type Polygon = {
  type: 'polygon';
  xPoints: number[];
  yPoints: number[];
  stroke: boolean;
};

type Polyline = {
  type: 'polyline';
  xPoints: number[];
  yPoints: number[];
};

type Spline = {
  type: 'spline';
  ax: number;
  bx: number;
  cx: number;
  dx: number;
  ex: number;
  fx: number;
  ay: number;
  by: number;
  cy: number;
  dy: number;
  ey: number;
  fy: number;
};

type Scale = {
  type: 'scale';
  scaleX: number;
  scaleY: number;
};

type Rotation = {
  type: 'rotation';
  rotation: number;
};

type Translate = {
  type: 'translate';
  x: number;
  y: number;
};

type Image = {
  type: 'image';
  path: string;
  x: number;
  y: number;
  pivotX: number;
  pivotY: number;
  width: number;
  height: number;
  theta: number;
  usePageFrame: boolean;
};

type Text = {
  type: 'text';
  text: string;
  x: number;
  y: number;
  font: string;
  stroke: boolean;
  usePageFrame: boolean;
  theta: number;
};

type Grid = {
  type: 'grid';
  x: number;
  y: number;
  width: number;
  height: number;
  numTicksX: number;
  numTicksY: number;
  pivotX: number;
  pivotY: number;
  theta: number;
  usePageFrame: boolean;
};

type Alpha = {
  type: 'alpha';
  alpha: number;
};

export type DrawOp =
  | Fill
  | Stroke
  | StrokeWidth
  | Circle
  | Polygon
  | Polyline
  | Spline
  | Scale
  | Rotation
  | Translate
  | Image
  | Text
  | Grid
  | Alpha;

export type TelemetryItem = {
  data: {
    [key: string]: string;
  };

  fieldOverlay: {
    ops: DrawOp[];
  };
  log: string[];
  timestamp: number;
};

export type ReceiveTelemetryAction = {
  type: typeof RECEIVE_TELEMETRY;
  telemetry: Telemetry;
};
