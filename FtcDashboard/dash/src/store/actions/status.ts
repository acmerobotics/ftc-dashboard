import {
  Status,
  ReceiveOpModeListAction,
  ReceiveRobotStatusAction,
  GET_ROBOT_STATUS,
  RECEIVE_OP_MODE_LIST,
  RECEIVE_ROBOT_STATUS,
} from '../types';

export const getRobotStatus = () => ({
  type: GET_ROBOT_STATUS,
});

export const receiveRobotStatus = (
  status: Status,
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
