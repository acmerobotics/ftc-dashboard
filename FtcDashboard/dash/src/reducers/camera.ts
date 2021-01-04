import { ReceiveImageAction } from './../actions/camera';
import { RECEIVE_IMAGE } from '../actions/camera';

export type CameraState = {
  imageStr: string;
};

const initialState: CameraState = {
  imageStr: '',
};

const telemetry = (
  state: CameraState = initialState,
  action: ReceiveImageAction,
): CameraState => {
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
