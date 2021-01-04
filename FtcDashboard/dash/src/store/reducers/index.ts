import { combineReducers } from 'redux';

import telemetryReducer from './telemetry';
import socketReducer from './socket';
import configReducer from './config';
import statusReducer from './status';
import cameraReducer from './camera';
import settingsReducer from './settings';
import gamepadReducer from './gamepad';

export default combineReducers({
  telemetry: telemetryReducer,
  socket: socketReducer,
  config: configReducer,
  status: statusReducer,
  camera: cameraReducer,
  settings: settingsReducer,
  gamepad: gamepadReducer,
});
