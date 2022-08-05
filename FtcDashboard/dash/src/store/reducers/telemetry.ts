import { bindActionCreators } from 'redux';
import { ClearTelemetryAction, CLEAR_TELEMETRY, ReceiveTelemetryAction, RECEIVE_TELEMETRY, Telemetry } from '../types';

const initialState: Telemetry =
  {
    timestamp: 0,
    data: {},
    log: [],
    fieldOverlay: {
      ops: [],
    },
  };

const telemetryReducer = (
  state = initialState,
  action: ReceiveTelemetryAction | ClearTelemetryAction,
) => {
  switch (action.type) {
    case RECEIVE_TELEMETRY:
      return action.telemetry.reduce((
        { data }: Telemetry, 
        { data: newData, timestamp, log, fieldOverlay }: Telemetry
      ) => ({
        timestamp,
        data: Object.keys(newData).reduce((acc, k) => ({
          [k]: newData[k],
          ...acc
        }), data),
        log,
        fieldOverlay
      }), state);
    case CLEAR_TELEMETRY:
      return initialState;
    default:
      return state;
  }
};

export default telemetryReducer;
