import { Values } from '../../typeHelpers';
import LayoutPreset from '../../enums/LayoutPreset';
import {
  GetLayoutPresetAction,
  ReceiveLayoutPresetAction,
  SaveLayoutPresetAction,
  GET_LAYOUT_PRESET,
  RECEIVE_LAYOUT_PRESET,
  SAVE_LAYOUT_PRESET,
} from '../types';

export const saveLayoutPreset = (
  preset: Values<typeof LayoutPreset>,
): SaveLayoutPresetAction => ({
  type: SAVE_LAYOUT_PRESET,
  preset,
});

export const receiveLayoutPreset = (
  preset: Values<typeof LayoutPreset>,
): ReceiveLayoutPresetAction => ({
  type: RECEIVE_LAYOUT_PRESET,
  preset,
});

export const getLayoutPreset = (): GetLayoutPresetAction => ({
  type: GET_LAYOUT_PRESET,
});
