import { RECEIVE_CONFIG_SCHEMA } from '../actions/configSchema';

const initialState = {};

const config = (state = initialState, action) => {
  switch (action.type) {
  case RECEIVE_CONFIG_SCHEMA:
    return action.data;
  default:
    return state;
  }
};

export default config;
