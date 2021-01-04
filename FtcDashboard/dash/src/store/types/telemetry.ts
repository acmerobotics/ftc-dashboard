export const RECEIVE_TELEMETRY = 'RECEIVE_TELEMETRY';

export type Telemetry = TelemetryItem[];

export type TelemetryItem = {
  data: {
    [key: string]: string;
  };

  // TODO type this
  fieldOverlay: {
    ops: any[];
  };
  log: string[];
  timestamp: number;
};

export type ReceiveTelemetryAction = {
  type: typeof RECEIVE_TELEMETRY;
  telemetry: Telemetry;
};
