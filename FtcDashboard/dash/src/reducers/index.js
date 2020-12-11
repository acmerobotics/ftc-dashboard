import { combineReducers } from 'redux';
import telemetry from './telemetry.js';
import socket from './socket.js';
import config from './config.js';
import status from './status.js';
import camera from './camera.js';
import settings from './settings.js';
import gamepad from './gamepad.js';

export default combineReducers({
  telemetry,
  socket,
  config,
  status,
  camera,
  settings,
  gamepad,
});
