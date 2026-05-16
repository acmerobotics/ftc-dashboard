export interface KeyboardMapping {
  // Stick controls
  left_stick_up?: string;
  left_stick_down?: string;
  left_stick_left?: string;
  left_stick_right?: string;
  right_stick_up?: string;
  right_stick_down?: string;
  right_stick_left?: string;
  right_stick_right?: string;
  
  // D-pad
  dpad_up?: string;
  dpad_down?: string;
  dpad_left?: string;
  dpad_right?: string;
  
  // Face buttons
  a?: string;
  b?: string;
  x?: string;
  y?: string;
  
  // Other buttons
  guide?: string;
  start?: string;
  back?: string;
  
  // Bumpers and triggers
  left_bumper?: string;
  right_bumper?: string;
  left_trigger?: string;
  right_trigger?: string;
  
  // Stick buttons
  left_stick_button?: string;
  right_stick_button?: string;
}

export const DEFAULT_KEYBOARD_MAPPING: KeyboardMapping = {
  // WASD for left stick
  left_stick_up: 'KeyW',
  left_stick_down: 'KeyS', 
  left_stick_left: 'KeyA',
  left_stick_right: 'KeyD',
  
  // Arrow keys for right stick 
  right_stick_up: 'ArrowUp',
  right_stick_down: 'ArrowDown',
  right_stick_left: 'ArrowLeft', 
  right_stick_right: 'ArrowRight',
  
  // D-pad using IJKL
  dpad_up: 'KeyI',
  dpad_down: 'KeyK',
  dpad_left: 'KeyJ',
  dpad_right: 'KeyL',
  
  // Face buttons using space, enter, etc.
  a: 'Space',
  b: 'KeyX',
  x: 'KeyZ',
  y: 'KeyC',
  
  // Other controls
  start: 'Enter',
  back: 'Backquote',
  guide: 'KeyG',
  
  // Bumpers and triggers
  left_bumper: 'KeyQ',
  right_bumper: 'KeyE',
  left_trigger: 'ShiftLeft',
  right_trigger: 'ShiftRight',
  
  // Stick buttons
  left_stick_button: 'KeyF',
  right_stick_button: 'KeyH',
};

export const KEYBOARD_MAPPING_SET_MAPPING = 'KEYBOARD_MAPPING_SET_MAPPING';
export const KEYBOARD_MAPPING_TOGGLE_ENABLED = 'KEYBOARD_MAPPING_TOGGLE_ENABLED';

export type SetKeyboardMappingAction = {
  type: typeof KEYBOARD_MAPPING_SET_MAPPING;
  mapping: KeyboardMapping;
};

export type ToggleKeyboardMappingEnabledAction = {
  type: typeof KEYBOARD_MAPPING_TOGGLE_ENABLED;
  enabled: boolean;
};

export type KeyboardMappingState = {
  mapping: KeyboardMapping;
  enabled: boolean;
};
