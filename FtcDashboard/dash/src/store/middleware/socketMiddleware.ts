import { Middleware } from 'redux';

import { RootState, AppThunkAction, AppThunkDispatch } from '@/store/reducers';
import { getRobotStatus } from '@/store/actions/status';
import {
  connect,
  receiveConnectionStatus,
  receivePingTime,
} from '@/store/actions/socket';
import {
  CONNECT,
  DISCONNECT,
  GET_ROBOT_STATUS,
  INIT_OP_MODE,
  RECEIVE_GAMEPAD_STATE,
  RECEIVE_ROBOT_STATUS,
  START_OP_MODE,
  STOP_OP_MODE,
} from '@/store/types';

let socket: WebSocket;
let statusSentTime: number;

const robotStatusLoop =
  (): AppThunkAction =>
  // TODO: Return to this. New Redux types too complex at the moment
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  (dispatch: AppThunkDispatch, getState: () => RootState) => {
    const { isConnected } = getState().socket;

    if (!isConnected) {
      return;
    }

    statusSentTime = Date.now();

    dispatch(getRobotStatus());

    setTimeout(() => {
      dispatch(robotStatusLoop());
    }, 1000);
  };

const socketMiddleware: Middleware<Record<string, unknown>, RootState> =
  (store) => (next) => (action) => {
    switch (action.type) {
      case CONNECT:
        socket = new WebSocket(`ws://${action.host}:${action.port}`);

        socket.onmessage = (evt) => {
          const msg = JSON.parse(evt.data);
          store.dispatch(msg);
        };

        socket.onopen = () => {
          (store.dispatch as AppThunkDispatch)(receiveConnectionStatus(true));

          (store.dispatch as AppThunkDispatch)(robotStatusLoop());
        };

        socket.onclose = () => {
          (store.dispatch as AppThunkDispatch)(receiveConnectionStatus(false));

          setTimeout(
            () => store.dispatch(connect(action.host, action.port)),
            500,
          );
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
      // messages forwarded to the server
      case RECEIVE_GAMEPAD_STATE:
      case GET_ROBOT_STATUS:
      case 'SAVE_CONFIG':
      case 'GET_CONFIG':
      case INIT_OP_MODE:
      case START_OP_MODE:
      case STOP_OP_MODE: {
        const { isConnected } = store.getState().socket;

        if (isConnected) {
          socket.send(JSON.stringify(action));
        }

        next(action);

        break;
      }
      default:
        next(action);

        break;
    }
  };

export default socketMiddleware;
