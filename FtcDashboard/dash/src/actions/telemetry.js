export const RECEIVE_TELEMETRY = 'RECEIVE_TELEMETRY';

export const receiveTelemetry = (telemetry) => ({
  type: RECEIVE_TELEMETRY,
  data: telemetry
});
