import { applyMiddleware, createStore } from 'redux';
import { createLogger } from 'redux-logger';
import thunk from 'redux-thunk';
import socketMiddleware from './socketMiddleware';
import storageMiddleware from './storageMiddleware';
import reducer from './reducers';
import { RECEIVE_PING_TIME } from './actions/socket';
import { RECEIVE_TELEMETRY } from './actions/telemetry';
import { RECEIVE_ROBOT_STATUS } from './actions/status';

const DEBUG = false;

const HIDDEN_ACTIONS = [RECEIVE_PING_TIME, RECEIVE_TELEMETRY, RECEIVE_ROBOT_STATUS];

const configureStore = () =>  {
  const middlewares = [thunk, socketMiddleware, storageMiddleware];

  if (DEBUG) {
    const logger = createLogger({
      predicate: (getState, action) => HIDDEN_ACTIONS.indexOf(action.type) === -1
    });

    middlewares.push(logger);
  }

  return createStore(
    reducer,
    applyMiddleware.apply(null, middlewares)
  );
};

export default configureStore;
