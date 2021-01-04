import { Telemetry } from '../../containers/types';

export const RECEIVE_TELEMETRY = 'RECEIVE_TELEMETRY';

export type ReceiveTelemetryAction = {
  type: typeof RECEIVE_TELEMETRY;
  telemetry: Telemetry;
};

export const receiveTelemetry = (telemetry: Telemetry) => ({
  type: RECEIVE_TELEMETRY,
  telemetry,
});
