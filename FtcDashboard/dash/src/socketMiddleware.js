import {
  CONNECT,
  DISCONNECT,
  connect,
  receiveConnectionStatus,
  receivePingTime
} from './actions/socket';
import {
  GET_CONFIG_OPTIONS,
  SAVE_CONFIG_OPTIONS
} from './actions/config';
import { 
  GET_ROBOT_STATUS,
  RECEIVE_ROBOT_STATUS,
  getRobotStatus
} from './actions/status';
import {
  INIT_OP_MODE,
  START_OP_MODE,
  STOP_OP_MODE
} from './actions/opmode';

let socket, statusSentTime;

export const robotStatusLoop = () => (
  (dispatch, getState) => {
    const { isConnected } = getState().socket;

    if (!isConnected) {
      return;
    }

    statusSentTime = Date.now();

    dispatch(getRobotStatus());

    setTimeout(() => {
      dispatch(robotStatusLoop());
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

      store.dispatch(robotStatusLoop());
    };

    socket.onclose = () => {
      store.dispatch(receiveConnectionStatus(false));

      setTimeout(() => store.dispatch(connect(action.host, action.port)), 500);
    };

    break;
  case DISCONNECT:
    socket.close();
    break;
  case RECEIVE_ROBOT_STATUS: {
    const pingTime = Date.now() - statusSentTime;
    store.dispatch(receivePingTime(pingTime));
    next(action);
    break;
  }
  case GET_ROBOT_STATUS:
  case SAVE_CONFIG_OPTIONS:
  case GET_CONFIG_OPTIONS: 
  case INIT_OP_MODE:
  case START_OP_MODE:
  case STOP_OP_MODE: {
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
