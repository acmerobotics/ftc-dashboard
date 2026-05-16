import {
  KeyboardMappingState,
  SetKeyboardMappingAction,
  ToggleKeyboardMappingEnabledAction,
  KEYBOARD_MAPPING_SET_MAPPING,
  KEYBOARD_MAPPING_TOGGLE_ENABLED,
  DEFAULT_KEYBOARD_MAPPING,
} from '@/store/types/keyboardMapping';

const initialState: KeyboardMappingState = {
  mapping: DEFAULT_KEYBOARD_MAPPING,
  enabled: false,
};

const keyboardMappingReducer = (
  state: KeyboardMappingState = initialState,
  action: SetKeyboardMappingAction | ToggleKeyboardMappingEnabledAction,
): KeyboardMappingState => {
  switch (action.type) {
    case KEYBOARD_MAPPING_SET_MAPPING:
      return {
        ...state,
        mapping: action.mapping,
      };
    case KEYBOARD_MAPPING_TOGGLE_ENABLED:
      return {
        ...state,
        enabled: action.enabled,
      };
    default:
      return state;
  }
};

export default keyboardMappingReducer;
