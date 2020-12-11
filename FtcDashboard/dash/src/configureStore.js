import { applyMiddleware, createStore } from 'redux';
import { createLogger } from 'redux-logger';
import thunk from 'redux-thunk';
import gamepadMiddleware from './middleware/gamepadMiddleware.js';
import socketMiddleware from './middleware/socketMiddleware.js';
import storageMiddleware from './middleware/storageMiddleware.js';
import reducer from './reducers/index.js';
import { RECEIVE_PING_TIME } from './actions/socket.js';
import { RECEIVE_TELEMETRY } from './actions/telemetry.js';
import { RECEIVE_ROBOT_STATUS, GET_ROBOT_STATUS } from './actions/status.js';

const HIDDEN_ACTIONS = [
  RECEIVE_PING_TIME,
  RECEIVE_TELEMETRY,
  RECEIVE_ROBOT_STATUS,
  GET_ROBOT_STATUS,
];

const configureStore = () => {
  const middlewares = [
    thunk,
    gamepadMiddleware,
    socketMiddleware,
    storageMiddleware,
  ];

  if (process.env.NODE_ENV === 'development') {
    const logger = createLogger({
      predicate: (getState, action) =>
        HIDDEN_ACTIONS.indexOf(action.type) === -1,
    });

    middlewares.push(logger);
  }

  return createStore(reducer, applyMiddleware.apply(null, middlewares));
};

export default configureStore;
