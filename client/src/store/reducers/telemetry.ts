import {
  ReceiveTelemetryAction,
  RECEIVE_TELEMETRY,
  SET_REPLAY_OVERLAY,
  Telemetry,
  SetReplayOverlayAction,
} from '@/store/types';

const initialState: Telemetry = [
  {
    timestamp: 0,
    data: {},
    log: [],
    field: {
      ops: [],
    },
    fieldOverlay: {
      ops: [],
    },
    replayOverlay: {
      ops: [],
    },
  },
];

const telemetryReducer = (state = initialState, action) => {
  switch (action.type) {
    case RECEIVE_TELEMETRY:
      return action.telemetry;

    case SET_REPLAY_OVERLAY:
      return state.map((item) => {
        return {
          ...item,
          replayOverlay: {
            ops: action.overlay,
          },
        };
      });

    default:
      return state;
  }
};

export default telemetryReducer;