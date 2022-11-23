import {
  GetRobotStatusAction,
  ReceiveOpModeListAction,
  ReceiveRobotStatusAction,
  GET_ROBOT_STATUS,
  RECEIVE_OP_MODE_LIST,
  RECEIVE_ROBOT_STATUS,
} from '../types';
import { RobotStatus } from '../types/status';

export const getRobotStatus = (): GetRobotStatusAction => ({
  type: GET_ROBOT_STATUS,
});

export const receiveRobotStatus = (
  status: RobotStatus,
): ReceiveRobotStatusAction => ({
  type: RECEIVE_ROBOT_STATUS,
  status,
});

export const receiveOpModeList = (
  opModeList: string[],
): ReceiveOpModeListAction => ({
  type: RECEIVE_OP_MODE_LIST,
  opModeList,
});
