import LayoutPreset from '../enums/LayoutPreset';
import { RECEIVE_LAYOUT_PRESET } from '../actions/settings';

const initialState = {
  layoutPreset: LayoutPreset.DEFAULT
};

const telemetry = (state = initialState, action) => {
  switch (action.type) {
  case RECEIVE_LAYOUT_PRESET:
    return {
      ...state,
      layoutPreset: action.preset
    };
  default:
    return state;
  }
};

export default telemetry;