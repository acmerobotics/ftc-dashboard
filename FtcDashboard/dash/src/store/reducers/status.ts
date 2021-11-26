import OpModeStatus from '../../enums/OpModeStatus';
import {
  ReceiveOpModeListAction,
  ReceiveRobotStatusAction,
  ReceiveDashboardWarning,
  RECEIVE_OP_MODE_LIST,
  RECEIVE_ROBOT_STATUS,
  RECEIVE_DASHBOARD_WARNING,
  StatusState,
} from '../types';

const initialState: StatusState = {
  available: false,
  activeOpMode: '',
  activeOpModeStatus: OpModeStatus.STOPPED,
  opModeList: [],
  warningMessage: '',
  errorMessage: '',
  dashboardWarningMessage: '',
};

const statusReducer = (
  state = initialState,
  action: ReceiveRobotStatusAction | ReceiveOpModeListAction | ReceiveDashboardWarning,
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
    case RECEIVE_DASHBOARD_WARNING:
      return {
        ...state,
        dashboardWarningMessage: action.dashboardWarningMessage,
      };
    default:
      return state;
  }
};

export default statusReducer;
