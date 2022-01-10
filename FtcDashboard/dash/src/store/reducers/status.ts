import OpModeStatus from '../../enums/OpModeStatus';
import {
  ReceiveOpModeListAction,
  ReceiveRobotStatusAction,
  GamepadSupportedStatus,
  RECEIVE_OP_MODE_LIST,
  RECEIVE_ROBOT_STATUS,
  GAMEPAD_SUPPORTED_STATUS,
  StatusState,
} from '../types';

const initialState: StatusState = {
  available: false,
  activeOpMode: '',
  activeOpModeStatus: OpModeStatus.STOPPED,
  opModeList: [],
  warningMessage: '',
  errorMessage: '',
  gamepadsSupported: true,
};

const statusReducer = (
  state = initialState,
  action: ReceiveRobotStatusAction | ReceiveOpModeListAction | GamepadSupportedStatus,
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
    case GAMEPAD_SUPPORTED_STATUS:
      return {
        ...state,
        gamepadsSupported: action.gamepadsSupported,
      };
    default:
      return state;
  }
};

export default statusReducer;
