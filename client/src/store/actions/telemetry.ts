import { Telemetry, RECEIVE_TELEMETRY, SET_REPLAY_OVERLAY } from '@/store/types';

export const receiveTelemetry = (telemetry: Telemetry) => ({
  type: RECEIVE_TELEMETRY,
  telemetry,
});

export const setReplayOverlay = (overlay: DrawOp[]) => ({
  type: SET_REPLAY_OVERLAY,
  overlay,
});
