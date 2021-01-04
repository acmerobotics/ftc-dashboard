import { Status } from '../reducers/status';

export const GET_ROBOT_STATUS = 'GET_ROBOT_STATUS';
export const RECEIVE_ROBOT_STATUS = 'RECEIVE_ROBOT_STATUS';
export const RECEIVE_OP_MODE_LIST = 'RECEIVE_OP_MODE_LIST';

export type GetRobotStatusAction = {
  type: typeof GET_ROBOT_STATUS;
};

export const getRobotStatus = () => ({
  type: GET_ROBOT_STATUS,
});

export type ReceiveRobotStatusAction = {
  type: typeof RECEIVE_ROBOT_STATUS;
  status: Status;
};

export const receiveRobotStatus = (
  status: Status,
): ReceiveRobotStatusAction => ({
  type: RECEIVE_ROBOT_STATUS,
  status,
});

export type ReceiveOpModeListAction = {
  type: typeof RECEIVE_OP_MODE_LIST;
  opModeList: string[];
};

export const receiveOpModeList = (
  opModeList: string[],
): ReceiveOpModeListAction => ({
  type: RECEIVE_OP_MODE_LIST,
  opModeList,
});
