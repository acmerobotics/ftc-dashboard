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
  // Named `width` on the wire (canvas/StrokeWidth.java) and read as op.width in
  // Field.js. The old `lineWidth` here never matched either.
  width: number;
};

type Circle = {
  type: 'circle';
  x: number;
  y: number;
  radius: number;
  stroke: boolean;
};

type Alpha = {
  type: 'alpha';
  alpha: number;
};

type Translate = {
  type: 'translate';
  x: number;
  y: number;
};

type Rotation = {
  type: 'rotation';
  rotation: number;
};

type Scale = {
  type: 'scale';
  scaleX: number;
  scaleY: number;
};

type Text = {
  type: 'text';
  text: string;
  x: number;
  y: number;
  font: string;
  theta: number;
  stroke: boolean;
  usePageFrame: boolean;
};

type Image = {
  type: 'image';
  path: string;
  x: number;
  y: number;
  width: number;
  height: number;
  theta: number;
  pivotX: number;
  pivotY: number;
  usePageFrame: boolean;
};

type Grid = {
  type: 'grid';
  x: number;
  y: number;
  width: number;
  height: number;
  numTicksX: number;
  numTicksY: number;
  theta: number;
  pivotX: number;
  pivotY: number;
  usePageFrame: boolean;
};

type Polygon = {
  type: 'polygon';
  xPoints: number[];
  yPoints: number[];
  stroke: string;
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

export type DrawOp =
  | Fill
  | Stroke
  | StrokeWidth
  | Circle
  | Polygon
  | Polyline
  | Spline
  | Alpha
  | Translate
  | Rotation
  | Scale
  | Text
  | Image
  | Grid;

export type TelemetryItem = {
  data: {
    [key: string]: string;
  };

  field: {
    ops: DrawOp[];
  };
  fieldOverlay: {
    ops: DrawOp[];
  };
  log: string[];
  timestamp: number;
  /** Replay only: the frame's offset inside its recording. */
  recordedMs?: number;
  /** Replay only: the state a seek landed on, not a packet the robot sent, so
   *  views that keep history skip it. */
  seed?: boolean;
};

export type ReceiveTelemetryAction = {
  type: typeof RECEIVE_TELEMETRY;
  telemetry: Telemetry;
  /**
   * Set on batches emitted by playbackMiddleware. Reducers never read it; it
   * exists so recorderMiddleware can tell replayed data from live data and not
   * record its own output back into the recording.
   */
  __replay?: true;
};

export type TelemetryAction = ReceiveTelemetryAction;
