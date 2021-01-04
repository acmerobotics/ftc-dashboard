import {
  RECEIVE_ROBOT_STATUS,
  RECEIVE_OP_MODE_LIST,
  ReceiveRobotStatusAction,
  ReceiveOpModeListAction,
} from '../actions/status';
import OpModeStatus from '../../enums/OpModeStatus';

import { Values } from '../../typeHelpers';

export type Status = {
  available: boolean;
  activeOpMode: string;
  activeOpModeStatus: Values<typeof OpModeStatus>;
  opModeList: string[];
  warningMessage: string;
  errorMessage: string;
};

const initialState = {
  available: false,
  activeOpMode: '',
  activeOpModeStatus: OpModeStatus.STOPPED,
  opModeList: [],
  warningMessage: '',
  errorMessage: '',
};

const telemetry = (
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

export default telemetry;
