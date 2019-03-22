export const GET_ROBOT_STATUS = 'GET_ROBOT_STATUS';
export const RECEIVE_ROBOT_STATUS = 'RECEIVE_ROBOT_STATUS';
export const RECEIVE_OP_MODE_LIST = 'RECEIVE_OP_MODE_LIST';

export const getRobotStatus = () => ({
  type: GET_ROBOT_STATUS
});

export const receiveRobotStatus = (status) => ({
  type: RECEIVE_ROBOT_STATUS,
  status
});

export const receiveOpModeList = (opModeList) => ({
  type: RECEIVE_OP_MODE_LIST,
  opModeList
});