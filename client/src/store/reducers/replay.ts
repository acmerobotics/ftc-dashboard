import type { DrawOp } from '@/store/types/telemetry';
import {
  SetReplayOverlayAction,
  SET_REPLAY_OVERLAY,
} from '@/store/types/replay';

type ReplayState = {
  ops: DrawOp[];
  /** Recorded telemetry values for the frame currently overlaid. */
  data: { [key: string]: string };
};

const initialState: ReplayState = {
  ops: [],
  data: {},
};

const replayReducer = (
  state = initialState,
  action: SetReplayOverlayAction,
): ReplayState => {
  switch (action.type) {
    case SET_REPLAY_OVERLAY:
      return {
        ops: action.overlay,
        data: action.data ?? {},
      };
    default:
      return state;
  }
};

export default replayReducer;
