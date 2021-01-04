import { RECEIVE_TELEMETRY } from '../actions/telemetry';

import { Telemetry } from '../containers/types';

const initialState: Telemetry = [
  {
    timestamp: 0,
    data: {},
    log: [],
    fieldOverlay: {
      ops: [],
    },
  },
];

const telemetry = (state = initialState, action: any) => {
  switch (action.type) {
    case RECEIVE_TELEMETRY:
      return action.telemetry;
    default:
      return state;
  }
};

export default telemetry;
