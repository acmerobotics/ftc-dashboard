import { Telemetry, RECEIVE_TELEMETRY } from '@/store/types/telemetry';

export const receiveTelemetry = (telemetry: Telemetry) => ({
  type: RECEIVE_TELEMETRY,
  telemetry,
});
