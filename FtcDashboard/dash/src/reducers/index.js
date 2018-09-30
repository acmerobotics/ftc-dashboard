import { combineReducers } from 'redux';
import telemetry from './telemetry';
import socket from './socket';
import config from './config';
import status from './status';
import camera from './camera';
import settings from './settings';

export default combineReducers({
  telemetry,
  socket,
  config,
  status,
  camera,
  settings
});
