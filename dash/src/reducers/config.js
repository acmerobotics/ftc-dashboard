import { RECEIVE_CONFIG, RECEIVE_CONFIG_SCHEMA, RECEIVE_MODIFIED_CONFIG } from '../actions/config';

const initialState = {
  schema: {},
  modifiedOptions: {},
  options: {},
};

const config = (state = initialState, action) => {
  switch (action.type) {
  case RECEIVE_CONFIG:
    return {
      ...state,
      options: action.data
    };
  case RECEIVE_CONFIG_SCHEMA:
    return {
      ...state,
      schema: action.data
    };
  case RECEIVE_MODIFIED_CONFIG:
    return {
      ...state,
      modifiedOptions: action.data
    };
  default:
    return state;
  }
};

export default config;
