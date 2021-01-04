import { Dispatch } from 'redux';
import { receiveOpModeList, ReceiveOpModeListAction } from './status';

export const CONNECT = 'CONNECT';
export const DISCONNECT = 'DISCONNECT';
export const RECEIVE_PING_TIME = 'RECEIVE_PING_TIME';
export const RECEIVE_CONNECTION_STATUS = 'RECEIVE_CONNECTION_STATUS';
export const SEND_MESSAGE = 'SEND_MESSAGE';

export type ConnectAction = {
  type: typeof CONNECT;
  host: string;
  port: string;
};

export const connect = (host: string, port: string): ConnectAction => ({
  type: CONNECT,
  host,
  port,
});

export type DisconnectAction = {
  type: typeof DISCONNECT;
};

export const disconnect = (): DisconnectAction => ({
  type: DISCONNECT,
});

export type ReceivePingTimeAction = {
  type: typeof RECEIVE_PING_TIME;
  pingTime: number;
};

export const receivePingTime = (pingTime: number): ReceivePingTimeAction => ({
  type: RECEIVE_PING_TIME,
  pingTime,
});

export type ReceiveConnectionStatusAction = {
  type: typeof RECEIVE_CONNECTION_STATUS;
  isConnected: boolean;
};

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
