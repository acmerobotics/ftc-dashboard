import { RECEIVE_ROBOT_STATUS } from '../actions/status';

const initialState = {
  available: false,
  activeOpMode: '',
  activeOpModeStatus: 'STOPPED',
};

const telemetry = (state = initialState, action) => {
  switch (action.type) {
  case RECEIVE_ROBOT_STATUS:
    return action.status;
  default:
    return state;
  }
};

export default telemetry;
