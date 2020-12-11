import { RECEIVE_TELEMETRY } from '../actions/telemetry.js';

const initialState = [
  {
    timestamp: 0,
    data: {},
    log: [],
    fieldOverlay: {
      ops: [],
    },
  },
];

const telemetry = (state = initialState, action) => {
  switch (action.type) {
    case RECEIVE_TELEMETRY:
      return action.telemetry;
    default:
      return state;
  }
};

export default telemetry;
