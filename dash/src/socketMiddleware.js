import {
  CONNECT,
  DISCONNECT,
  PING,
  PONG,
  ping,
  connect,
  receiveConnectionStatus,
  receivePingTime
} from './actions/socket';
import {
  GET_CONFIG_OPTIONS,
  SAVE_CONFIG_OPTIONS
} from './actions/config';

let socket, pingSentTime;

export const pingLoop = () => (
  (dispatch, getState) => {
    const { isConnected } = getState().socket;

    if (!isConnected) {
      return;
    }

    pingSentTime = Date.now();

    dispatch(ping());

    setTimeout(() => {
      dispatch(pingLoop());
    }, 1000);
  }
);

const socketMiddleware = store => next => action => {
  switch (action.type) {
  case CONNECT:
    socket = new WebSocket(`ws://${action.host}:${action.port}`);

    socket.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      store.dispatch(msg);
    };

    socket.onopen = () => {
      store.dispatch(receiveConnectionStatus(true));

      store.dispatch(pingLoop());
    };

    socket.onclose = () => {
      store.dispatch(receiveConnectionStatus(false));

      setTimeout(() => store.dispatch(connect(action.host, action.port)), 3000);
    };

    break;
  case DISCONNECT:
    socket.close();
    break;
  case PONG: {
    const pingTime = Date.now() - pingSentTime;
    store.dispatch(receivePingTime(pingTime));
    break;
  }
  case PING:
  case SAVE_CONFIG_OPTIONS:
  case GET_CONFIG_OPTIONS: {
    const { isConnected } = store.getState().socket;

    if (isConnected) {
      socket.send(JSON.stringify(action));
    }

    break;
  }
  default:
    next(action);

    break;
  }
};

export default socketMiddleware;
