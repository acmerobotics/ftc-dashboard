import { Telemetry, RECEIVE_TELEMETRY } from '../types';

export const receiveTelemetry = (telemetry: Telemetry) => ({
  type: RECEIVE_TELEMETRY,
  telemetry,
});
