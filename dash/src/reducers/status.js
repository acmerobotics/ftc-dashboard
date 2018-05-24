import { RECEIVE_ROBOT_STATUS } from '../actions/status';

const initialState = {
  statusAvailable: false,
  activeOpMode: '',
  activeOpModeStatus: '',
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
