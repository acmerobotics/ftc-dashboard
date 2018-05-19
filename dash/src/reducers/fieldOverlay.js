import { RECEIVE_FIELD_OVERLAY } from '../actions/fieldOverlay';

const initialState = {
  ops: []
};

const fieldOverlay = (state = initialState, action) => {
  switch (action.type) {
  case RECEIVE_FIELD_OVERLAY:
    return action.data;
  default:
    return state;
  }
};

export default fieldOverlay;
