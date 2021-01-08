import { Dispatch } from 'redux';

import {
  CONNECT,
  DISCONNECT,
  ConnectAction,
  DisconnectAction,
  ReceiveConnectionStatusAction,
  ReceiveOpModeListAction,
  ReceivePingTimeAction,
  RECEIVE_CONNECTION_STATUS,
  RECEIVE_PING_TIME,
} from '../types';
import { receiveOpModeList } from './status';

export const connect = (host: string, port: string): ConnectAction => ({
  type: CONNECT,
  host,
  port,
});

export const disconnect = (): DisconnectAction => ({
  type: DISCONNECT,
});

export const receivePingTime = (pingTime: number): ReceivePingTimeAction => ({
  type: RECEIVE_PING_TIME,
  pingTime,
});

export const receiveConnectionStatus = (isConnected: boolean) => (
  dispatch: Dispatch<ReceiveConnectionStatusAction | ReceiveOpModeListAction>,
) => {
  dispatch({
    type: RECEIVE_CONNECTION_STATUS,
    isConnected,
  });

  if (!isConnected) {
    dispatch(receiveOpModeList([]));
  }
};
