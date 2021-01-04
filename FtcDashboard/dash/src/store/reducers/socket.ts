import {
  RECEIVE_PING_TIME,
  RECEIVE_CONNECTION_STATUS,
  ReceivePingTimeAction,
  ReceiveConnectionStatusAction,
} from '../actions/socket';

type SocketState = {
  isConnected: boolean;
  pingTime: number;
};

const initialState: SocketState = {
  isConnected: false,
  pingTime: 0,
};

const socket = (
  state = initialState,
  action: ReceivePingTimeAction | ReceiveConnectionStatusAction,
) => {
  switch (action.type) {
    case RECEIVE_PING_TIME:
      return {
        ...state,
        pingTime: action.pingTime,
      };
    case RECEIVE_CONNECTION_STATUS:
      return {
        ...state,
        isConnected: action.isConnected,
      };
    default:
      return state;
  }
};

export default socket;
