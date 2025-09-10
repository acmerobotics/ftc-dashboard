import {
  StatusState,
  ReceiveOpModeListAction,
  ReceiveRobotStatusAction,
  RECEIVE_OP_MODE_LIST,
  RECEIVE_ROBOT_STATUS,
  OpModeInfo,
} from '@/store/types/status';

export const receiveRobotStatus = (
  status: StatusState,
): ReceiveRobotStatusAction => ({
  type: RECEIVE_ROBOT_STATUS,
  status,
});

export const receiveOpModeList = (
  opModeInfoList: OpModeInfo[],
): ReceiveOpModeListAction => ({
  type: RECEIVE_OP_MODE_LIST,
  opModeInfoList,
});
