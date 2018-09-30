export const SAVE_LAYOUT_PRESET = 'SAVE_LAYOUT_PRESET';
export const RECEIVE_LAYOUT_PRESET = 'RECEIVE_LAYOUT_PRESET';
export const GET_LAYOUT_PRESET = 'GET_LAYOUT_PRESET';

export const saveLayoutPreset = (preset) => ({
  type: SAVE_LAYOUT_PRESET,
  preset
});

export const receiveLayoutPreset = (preset) => ({
  type: RECEIVE_LAYOUT_PRESET,
  preset
});

export const getLayoutPreset = () => ({
  type: GET_LAYOUT_PRESET
});