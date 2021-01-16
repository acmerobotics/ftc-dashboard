import {
  SAVE_LAYOUT_PRESET,
  SaveLayoutPresetAction,
} from './../types/settings';
import LayoutPreset from '../../enums/LayoutPreset';

import {
  SettingState,
  ReceiveLayoutPresetAction,
  RECEIVE_LAYOUT_PRESET,
} from '../types';

const initialState: SettingState = {
  layoutPreset: LayoutPreset.DEFAULT,
};

const settingsReducer = (
  state: SettingState = initialState,
  action: ReceiveLayoutPresetAction | SaveLayoutPresetAction,
) => {
  switch (action.type) {
    case RECEIVE_LAYOUT_PRESET:
      return {
        ...state,
        layoutPreset: action.preset,
      };
    case SAVE_LAYOUT_PRESET:
      return {
        ...state,
        layoutPreset: action.preset,
      };
    default:
      return state;
  }
};

export default settingsReducer;
