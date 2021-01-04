import LayoutPreset from '../../enums/LayoutPreset';
import { RECEIVE_LAYOUT_PRESET } from '../actions/settings';

import { Values } from '../../typeHelpers';

export type SettingState = {
  layoutPreset: Values<typeof LayoutPreset>;
};

const initialState = {
  layoutPreset: LayoutPreset.DEFAULT,
};

const telemetry = (state: SettingState = initialState, action: any) => {
  switch (action.type) {
    case RECEIVE_LAYOUT_PRESET:
      return {
        ...state,
        layoutPreset: action.preset,
      };
    default:
      return state;
  }
};

export default telemetry;
