import { Middleware } from 'redux';

import LayoutPreset, { LayoutPresetType } from '../../enums/LayoutPreset';
import { GET_LAYOUT_PRESET } from '../types';
import { receiveLayoutPreset } from '../actions/settings';
import { RootState } from '../reducers';

// TODO move this elsewhere
const LAYOUT_PRESET_KEY = 'layoutPreset';

const storageMiddleware: Middleware<Record<string, unknown>, RootState> = (
  store,
) => (next) => (action) => {
  switch (action.type) {
    case GET_LAYOUT_PRESET: {
      const preset =
        localStorage.getItem(LAYOUT_PRESET_KEY) || LayoutPreset.DEFAULT;

      store.dispatch(receiveLayoutPreset(preset as LayoutPresetType));

      break;
    }
    default:
      next(action);

      break;
  }
};

export default storageMiddleware;
