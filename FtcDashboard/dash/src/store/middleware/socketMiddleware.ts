import { Middleware } from 'redux';

import { RootState, AppThunkAction, AppThunkDispatch } from './../reducers';
import { getRobotStatus } from '../actions/status';
import { receiveConnectionStatus, receivePingTime } from '../actions/socket';
import {
  CONNECT,
  DISCONNECT,
  GET_CONFIG,
  GET_ROBOT_STATUS,
  INIT_OP_MODE,
  RECEIVE_GAMEPAD_STATE,
  RECEIVE_ROBOT_STATUS,
  SAVE_CONFIG,
  START_OP_MODE,
  STOP_OP_MODE,
} from '../types';
import MockSocket from './MockSocket';

let socket: WebSocket;
let statusSentTime: number;

const robotStatusLoop =
  (): AppThunkAction =>
  // TODO: Return to this. New Redux types too complex at the moment
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  (dispatch: AppThunkDispatch, getState: () => RootState) => {
    if (!getState().socket.isConnected) return;

    statusSentTime = Date.now();

    dispatch(getRobotStatus());
    setTimeout(() => dispatch(robotStatusLoop()), 1000);
  };

const socketMiddleware: Middleware<Record<string, unknown>, RootState> =
  (store) => (next) => (action) => {
    switch (action.type) {
      case CONNECT:
        if (socket) {
          socket.onclose = null;
          socket.onopen = null;
          socket.onmessage = null;
          if (socket.CONNECTING || socket.OPEN) socket.close();
        }

        const host =
          import.meta.env['VITE_REACT_APP_HOST']?.toString() ??
          window.location.hostname;
        const port =
          import.meta.env['VITE_REACT_APP_PORT']?.toString() ?? '8000';
        socket = action.socket ?? new WebSocket(`ws://${host}:${port}`);

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
          // TODO: Move reconnect to its own loop. Causes race conditions for socket connection
          // setTimeout(() => store.dispatch(connect()), 500);
        };

        // Force open after setup of the onX() hooks
        // @ts-ignore
        if (socket.IS_MOCK_SOCKET) (socket as MockSocket).DEV_OPEN();
        break;
      case DISCONNECT:
        socket?.close();
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
      case SAVE_CONFIG:
      case GET_CONFIG:
      case INIT_OP_MODE:
      case START_OP_MODE:
      case STOP_OP_MODE: {
        if (store.getState().socket.isConnected)
          socket.send(JSON.stringify(action));
        next(action);
        break;
      }
      default:
        next(action);
        break;
    }
  };

export { socketMiddleware as default };
