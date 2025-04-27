import type { DrawOp } from '@/store/types/telemetry';

import {
  SetReplayOverlayAction,
  SET_REPLAY_OVERLAY,
} from '@/store/types/replay';

export const setReplayOverlay = (
  overlay: DrawOp[],
): SetReplayOverlayAction => ({
  type: SET_REPLAY_OVERLAY,
  overlay,
});
