import type { DrawOp } from '../types/telemetry';

import { SetReplayOverlayAction, SET_REPLAY_OVERLAY } from '@/store/types/replay';

export const setReplayOverlay = (overlay: DrawOp[]): SetReplayOverlayAction => ({
  type: SET_REPLAY_OVERLAY,
  overlay,
  });

