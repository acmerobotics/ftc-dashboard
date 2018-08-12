import { RECEIVE_ROBOT_STATUS, RECEIVE_OP_MODE_LIST } from '../actions/status';
import OpModeStatus from '../enums/OpModeStatus';

const initialState = {
  available: false,
  activeOpMode: '',
  activeOpModeStatus: OpModeStatus.STOPPED,
  opModeList: [],
  warningMessage: '',
  errorMessage: ''
};

const telemetry = (state = initialState, action) => {
  switch (action.type) {
  case RECEIVE_ROBOT_STATUS:
    return {
      ...state,
      ...action.data
    };
  case RECEIVE_OP_MODE_LIST:
    return {
      ...state,
      opModeList: action.data
    };
  default:
    return state;
  }
};

export default telemetry;
