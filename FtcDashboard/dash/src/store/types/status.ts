import OpModeStatus from './../../enums/OpModeStatus';
import { Values } from '../../typeHelpers';

export const GET_ROBOT_STATUS = 'GET_ROBOT_STATUS';
export const RECEIVE_ROBOT_STATUS = 'RECEIVE_ROBOT_STATUS';
export const RECEIVE_OP_MODE_LIST = 'RECEIVE_OP_MODE_LIST';

export type StatusState = {
  available: boolean;
  activeOpMode: string;
  activeOpModeStatus: Values<typeof OpModeStatus>;
  opModeList: string[];
  warningMessage: string;
  errorMessage: string;
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
