import { 
  RECEIVE_CONFIG_OPTIONS, 
  RECEIVE_CONFIG_SCHEMA, 
  UPDATE_CONFIG_OPTIONS 
} from '../actions/config';

const initialState = {
  schema: {},
  modifiedOptions: {},
  options: {},
};

const config = (state = initialState, action) => {
  switch (action.type) {
  case RECEIVE_CONFIG_OPTIONS:
    return {
      ...state,
      options: action.data
    };
  case RECEIVE_CONFIG_SCHEMA:
    return {
      ...state,
      schema: action.data
    };
  case UPDATE_CONFIG_OPTIONS:
    return {
      ...state,
      modifiedOptions: action.data
    };
  default:
    return state;
  }
};

export default config;
