import {
  GET_LAYOUT_PRESET,
  SAVE_LAYOUT_PRESET,
  receiveLayoutPreset
} from '../actions/settings';
import LayoutPreset from '../enums/LayoutPreset';

const LAYOUT_PRESET_KEY = 'layoutPreset';

const storageMiddleware = store => next => action => {
  switch (action.type) {
  case GET_LAYOUT_PRESET: {
    const preset = localStorage.getItem(LAYOUT_PRESET_KEY) || LayoutPreset.DEFAULT;

    store.dispatch(receiveLayoutPreset(preset));

    break;
  }
  case SAVE_LAYOUT_PRESET: {
    localStorage.setItem(LAYOUT_PRESET_KEY, action.preset);

    store.dispatch(receiveLayoutPreset(action.preset));

    break;
  }
  default:
    next(action);

    break;
  }
};

export default storageMiddleware;
