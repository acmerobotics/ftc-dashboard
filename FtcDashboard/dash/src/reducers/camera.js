import { RECEIVE_IMAGE } from '../actions/camera';

const initialState = {
  imageStr: ''
};

const telemetry = (state = initialState, action) => {
  switch (action.type) {
  case RECEIVE_IMAGE:
    return {
      ...state,
      imageStr: action.data
    };
  default:
    return state;
  }
};

export default telemetry;
