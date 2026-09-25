import { Middleware } from 'redux';

import { RootState, AppThunkDispatch } from '@/store/reducers';
import {
  receiveConnectionStatus,
  receivePingTime,
} from '@/store/actions/socket';
import {
  GET_ROBOT_STATUS,
  INIT_OP_MODE,
  RECEIVE_CONNECTION_STATUS,
  RECEIVE_GAMEPAD_STATE,
  RECEIVE_ROBOT_STATUS,
  SET_HARDWARE_CONFIG,
  WRITE_HARDWARE_CONFIG,
  DELETE_HARDWARE_CONFIG,
  START_LOGCAT_CAPTURE,
  START_OP_MODE,
  STOP_LOGCAT_CAPTURE,
  STOP_OP_MODE,
} from '@/store/types';
import {
  START_LOG_RECORDING,
  STOP_LOG_RECORDING,
  CLEAR_LOG_RECORDING,
} from '@/store/types/logRecorder';

let socket: WebSocket;
let statusSentTime: number;

const sendToRobot = (message: { type: string }) => {
  if (socket !== undefined && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
};

export function startSocketWatcher(dispatch: AppThunkDispatch) {
  setInterval(() => {
    if (socket === undefined || socket.readyState === WebSocket.CLOSED) {
      socket = new WebSocket(
        `ws://${
          import.meta.env['VITE_REACT_APP_HOST'] || window.location.hostname
        }:${import.meta.env['VITE_REACT_APP_PORT']}`,
      );

      socket.onmessage = (evt) => {
        const msg = JSON.parse(evt.data);
        dispatch(msg);
      };

      socket.onopen = () => {
        dispatch(receiveConnectionStatus(true));
      };

      socket.onclose = () => {
        dispatch(receiveConnectionStatus(false));
      };
    } else if (socket.readyState === WebSocket.OPEN) {
      statusSentTime = Date.now();
      socket.send(JSON.stringify({ type: 'GET_ROBOT_STATUS' }));
    }

    dispatch(receiveConnectionStatus(socket.readyState === WebSocket.OPEN));
  }, 1000);
}

const socketMiddleware: Middleware<Record<string, unknown>, RootState> =
  (store) => (next) => (action) => {
    switch (action.type) {
      case RECEIVE_ROBOT_STATUS: {
        const pingTime = Date.now() - statusSentTime;
        store.dispatch(receivePingTime(pingTime));

        // Disabling the dashboard drops the robot's capture, so a recording that
        // outlives it has to ask again.
        const wasEnabled = store.getState().status.enabled;

        next(action);

        if (
          !wasEnabled &&
          action.status.enabled &&
          store.getState().logRecorder.isRecording
        ) {
          sendToRobot({ type: START_LOGCAT_CAPTURE });
        }

        break;
      }
      // messages forwarded to the server
      case RECEIVE_GAMEPAD_STATE:
      case GET_ROBOT_STATUS:
      case 'SAVE_CONFIG':
      case 'GET_CONFIG':
      case 'GET_CONFIG_BASELINE':
      case INIT_OP_MODE:
      case START_OP_MODE:
      case SET_HARDWARE_CONFIG:
      case WRITE_HARDWARE_CONFIG:
      case DELETE_HARDWARE_CONFIG:
      case STOP_OP_MODE: {
        sendToRobot(action);

        next(action);

        break;
      }
      // the recorder drives the robot's full logcat capture
      case START_LOG_RECORDING: {
        sendToRobot({ type: START_LOGCAT_CAPTURE });

        next(action);

        break;
      }
      case STOP_LOG_RECORDING:
      case CLEAR_LOG_RECORDING: {
        sendToRobot({ type: STOP_LOGCAT_CAPTURE });

        next(action);

        break;
      }
      case RECEIVE_CONNECTION_STATUS: {
        // The robot forgets which sockets were capturing when one drops, so a recording that
        // outlives a reconnect has to ask again.
        const wasConnected = store.getState().socket.isConnected;

        next(action);

        if (
          !wasConnected &&
          action.isConnected &&
          store.getState().logRecorder.isRecording
        ) {
          sendToRobot({ type: START_LOGCAT_CAPTURE });
        }

        break;
      }
      default:
        next(action);

        break;
    }
  };

export default socketMiddleware;
