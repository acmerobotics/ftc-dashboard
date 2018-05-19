import { applyMiddleware, createStore } from 'redux';
import { createLogger } from 'redux-logger';
import thunk from 'redux-thunk';
import socketMiddleware from './socketMiddleware';
import reducer from './reducers';
import { RECEIVE_PING_TIME } from './actions/socket';
import { RECEIVE_TELEMETRY } from './actions/telemetry';

const logger = createLogger({
  predicate: (getState, action) => (action.type !== RECEIVE_PING_TIME && action.type !== RECEIVE_TELEMETRY)
});

const configureStore = () => (
  createStore(
    reducer,
    applyMiddleware(thunk, socketMiddleware, logger)
    // applyMiddleware(thunk, socketMiddleware)
  )
);

export default configureStore;
