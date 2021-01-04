export const SAVE_LAYOUT_PRESET = 'SAVE_LAYOUT_PRESET';
export const RECEIVE_LAYOUT_PRESET = 'RECEIVE_LAYOUT_PRESET';
export const GET_LAYOUT_PRESET = 'GET_LAYOUT_PRESET';

import { Values } from '../typeHelpers';
import LayoutPreset from '../enums/LayoutPreset';

type SaveLayoutPresetAction = {
  type: typeof SAVE_LAYOUT_PRESET;
  preset: Values<typeof LayoutPreset>;
};

export const saveLayoutPreset = (
  preset: Values<typeof LayoutPreset>,
): SaveLayoutPresetAction => ({
  type: SAVE_LAYOUT_PRESET,
  preset,
});

type ReceiveLayoutPresetAction = {
  type: typeof RECEIVE_LAYOUT_PRESET;
  preset: Values<typeof LayoutPreset>;
};

export const receiveLayoutPreset = (
  preset: Values<typeof LayoutPreset>,
): ReceiveLayoutPresetAction => ({
  type: RECEIVE_LAYOUT_PRESET,
  preset,
});

type GetLayoutPresetAction = {
  type: typeof GET_LAYOUT_PRESET;
};

export const getLayoutPreset = (): GetLayoutPresetAction => ({
  type: GET_LAYOUT_PRESET,
});
