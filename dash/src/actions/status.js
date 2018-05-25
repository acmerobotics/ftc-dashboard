export const GET_ROBOT_STATUS = 'GET_ROBOT_STATUS';
export const RECEIVE_ROBOT_STATUS = 'RECEIVE_ROBOT_STATUS';
export const GET_OP_MODE_LIST = 'GET_OP_MODE_LIST';
export const RECEIVE_OP_MODE_LIST = 'RECEIVE_OP_MODE_LIST';

export const getRobotStatus = () => ({
  type: GET_ROBOT_STATUS
});

export const receiveRobotStatus = (data) => ({
  type: RECEIVE_ROBOT_STATUS,
  data
});

export const getOpModeList = () => ({
  type: GET_OP_MODE_LIST
});

export const receiveOpModeList = (data) => ({
  type: RECEIVE_OP_MODE_LIST,
  data
});