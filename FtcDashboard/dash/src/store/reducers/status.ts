import OpModeStatus from '../../enums/OpModeStatus';
import {
  ReceiveOpModeListAction,
  ReceiveRobotStatusAction,
  RECEIVE_OP_MODE_LIST,
  RECEIVE_ROBOT_STATUS,
  StatusState,
} from '../types';

const initialState: StatusState = {
  available: false,
  activeOpMode: '',
  activeOpModeStatus: OpModeStatus.STOPPED,
  opModeList: [],
  warningMessage: '',
  errorMessage: '',
};

const statusReducer = (
  state = initialState,
  action: ReceiveRobotStatusAction | ReceiveOpModeListAction,
) => {
  switch (action.type) {
    case RECEIVE_ROBOT_STATUS:
      return {
        ...state,
        ...action.status,
      };
    case RECEIVE_OP_MODE_LIST:
      return {
        ...state,
        opModeList: action.opModeList,
      };
    default:
      return state;
  }
};

export default statusReducer;
