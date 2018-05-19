import {
  RECEIVE_PING_TIME,
  RECEIVE_CONNECTION_STATUS
} from '../actions/socket';

const initialState = {
  isConnected: false,
  pingTime: 0
};

const socket = (state = initialState, action) => {
  switch (action.type) {
  case RECEIVE_PING_TIME:
    return {
      ...state,
      pingTime: action.pingTime
    };
  case RECEIVE_CONNECTION_STATUS:
    return {
      ...state,
      isConnected: action.isConnected
    };
  default:
    return state;
  }
};

export default socket;
