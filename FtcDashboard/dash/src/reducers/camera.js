import { RECEIVE_IMAGE } from '../actions/camera.js';

const initialState = {
  imageStr: '',
};

const telemetry = (state = initialState, action) => {
  switch (action.type) {
    case RECEIVE_IMAGE:
      return {
        ...state,
        imageStr: action.imageString,
      };
    default:
      return state;
  }
};

export default telemetry;
