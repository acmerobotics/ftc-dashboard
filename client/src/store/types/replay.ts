import type { DrawOp } from '@/store/types/telemetry';

export const SET_REPLAY_OVERLAY = 'SET_REPLAY_OVERLAY';

export type SetReplayOverlayAction = {
  type: typeof SET_REPLAY_OVERLAY;
  overlay: DrawOp[];
};

export type ReplayAction = SetReplayOverlayAction;
