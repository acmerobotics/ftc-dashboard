export const CONNECT = 'CONNECT';
export const DISCONNECT = 'DISCONNECT';
export const RECEIVE_PING_TIME = 'RECEIVE_PING_TIME';
export const RECEIVE_CONNECTION_STATUS = 'RECEIVE_CONNECTION_STATUS';
export const SEND_MESSAGE = 'SEND_MESSAGE';
export const PING = 'PING';
export const PONG = 'PONG';

export const connect = (host, port) => ({
  type: CONNECT,
  host,
  port
});

export const disconnect = () => ({
  type: DISCONNECT
});

export const receivePingTime = (pingTime) => ({
  type: RECEIVE_PING_TIME,
  pingTime
});

export const receiveConnectionStatus = (isConnected) => ({
  type: RECEIVE_CONNECTION_STATUS,
  isConnected
});

export const ping = () => ({
  type: PING
});
