import { applyMiddleware, createStore } from 'redux';
import { createLogger } from 'redux-logger';
import thunk from 'redux-thunk';

import { followOtherTabs } from './actions/playback';
import gamepadMiddleware from './middleware/gamepadMiddleware';
import playbackMiddleware from './middleware/playbackMiddleware';
import recorderMiddleware from './middleware/recorderMiddleware';
import socketMiddleware from './middleware/socketMiddleware';
import storageMiddleware from './middleware/storageMiddleware';
import rootReducer from './reducers';
import {
  GET_ROBOT_STATUS,
  RECEIVE_PING_TIME,
  RECEIVE_ROBOT_STATUS,
  RECEIVE_TELEMETRY,
} from './types';
import { PLAYBACK_TICK } from './types/playback';

const HIDDEN_ACTIONS = [
  RECEIVE_PING_TIME,
  RECEIVE_TELEMETRY,
  RECEIVE_ROBOT_STATUS,
  GET_ROBOT_STATUS,
  PLAYBACK_TICK,
];

const configureStore = () => {
  const middlewares = [
    thunk,
    gamepadMiddleware,
    socketMiddleware,
    // Both sit downstream of socketMiddleware so outbound op-mode, gamepad and
    // config messages still reach the robot, and upstream of the reducers so
    // the playback gate can withhold live telemetry.
    recorderMiddleware,
    playbackMiddleware,
    storageMiddleware,
  ];

  if (import.meta.env.DEV) {
    const logger = createLogger({
      predicate: (getState, action) =>
        HIDDEN_ACTIONS.indexOf(action.type) === -1,
    });

    middlewares.push(logger);
  }

  const store = createStore(rootReducer, applyMiddleware(...middlewares));
  followOtherTabs(store.dispatch);
  return store;
};

export default configureStore;
