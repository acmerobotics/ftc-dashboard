import {
  KeyboardMapping,
  SetKeyboardMappingAction,
  ToggleKeyboardMappingEnabledAction,
  KEYBOARD_MAPPING_SET_MAPPING,
  KEYBOARD_MAPPING_TOGGLE_ENABLED,
} from '@/store/types/keyboardMapping';

export const setKeyboardMapping = (mapping: KeyboardMapping): SetKeyboardMappingAction => ({
  type: KEYBOARD_MAPPING_SET_MAPPING,
  mapping,
});

export const toggleKeyboardMappingEnabled = (enabled: boolean): ToggleKeyboardMappingEnabledAction => ({
  type: KEYBOARD_MAPPING_TOGGLE_ENABLED,
  enabled,
});
