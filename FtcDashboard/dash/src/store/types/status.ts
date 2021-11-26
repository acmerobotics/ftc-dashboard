import OpModeStatus from './../../enums/OpModeStatus';
import { Values } from '../../typeHelpers';

export const GET_ROBOT_STATUS = 'GET_ROBOT_STATUS';
export const RECEIVE_ROBOT_STATUS = 'RECEIVE_ROBOT_STATUS';
export const RECEIVE_OP_MODE_LIST = 'RECEIVE_OP_MODE_LIST';
export const RECEIVE_DASHBOARD_WARNING = 'RECEIVE_DASHBOARD_WARNING';

export type StatusState = {
  available: boolean;
  activeOpMode: string;
  activeOpModeStatus: Values<typeof OpModeStatus>;
  opModeList: string[];
  warningMessage: string;
  errorMessage: string;
  dashboardWarningMessage: string;
};

export type GetRobotStatusAction = {
  type: typeof GET_ROBOT_STATUS;
};

export type ReceiveRobotStatusAction = {
  type: typeof RECEIVE_ROBOT_STATUS;
  status: StatusState;
};

export type ReceiveOpModeListAction = {
  type: typeof RECEIVE_OP_MODE_LIST;
  opModeList: string[];
};

export type ReceiveDashboardWarning = {
    type: typeof RECEIVE_DASHBOARD_WARNING;
    dashboardWarningMessage: string;
}
