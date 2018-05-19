import { combineReducers } from 'redux';
import telemetry from './telemetry';
import socket from './socket';
import config from './config';
import configSchema from './configSchema';

export default combineReducers({
  telemetry,
  socket,
  config,
  configSchema
});
