import { Values } from '@/typeHelpers';

import LayoutPreset from '@/enums/LayoutPreset';

export const SAVE_LAYOUT_PRESET = 'SAVE_LAYOUT_PRESET';
export const RECEIVE_LAYOUT_PRESET = 'RECEIVE_LAYOUT_PRESET';
export const GET_LAYOUT_PRESET = 'GET_LAYOUT_PRESET';

export const GET_SAVED_LAYOUTS = 'GET_SAVED_LAYOUTS';
export const RECEIVE_SAVED_LAYOUTS = 'RECEIVE_SAVED_LAYOUTS';
export const SAVE_LAYOUT = 'SAVE_LAYOUT';
export const DELETE_SAVED_LAYOUT = 'DELETE_SAVED_LAYOUT';
export const LOAD_SAVED_LAYOUT = 'LOAD_SAVED_LAYOUT';
export const RECEIVE_LAYOUT_TO_LOAD = 'RECEIVE_LAYOUT_TO_LOAD';
export const LAYOUT_LOADED = 'LAYOUT_LOADED';
export const SET_SAVED_LAYOUT_EDITED = 'SET_SAVED_LAYOUT_EDITED';

// A custom layout kept in this browser, stored as its share code.
export type SavedLayout = {
  id: string;
  name: string;
  code: string;
};

export type SettingState = {
  layoutPreset: Values<typeof LayoutPreset>;
  savedLayouts: SavedLayout[];
  // The saved layout the custom layout was last loaded from, if any.
  activeSavedLayout: { id: string; edited: boolean } | null;
  // A layout waiting for the custom layout to apply it.
  layoutToLoad: { name: string; code: string } | null;
};

export type SaveLayoutPresetAction = {
  type: typeof SAVE_LAYOUT_PRESET;
  preset: Values<typeof LayoutPreset>;
};

export type ReceiveLayoutPresetAction = {
  type: typeof RECEIVE_LAYOUT_PRESET;
  preset: Values<typeof LayoutPreset>;
};

export type GetLayoutPresetAction = {
  type: typeof GET_LAYOUT_PRESET;
};

export type GetSavedLayoutsAction = {
  type: typeof GET_SAVED_LAYOUTS;
  fromOtherTab: boolean;
};

export type ReceiveSavedLayoutsAction = {
  type: typeof RECEIVE_SAVED_LAYOUTS;
  layouts: SavedLayout[];
  activeId: string | null;
};

export type SaveLayoutAction = {
  type: typeof SAVE_LAYOUT;
  name: string;
  code: string;
};

export type DeleteSavedLayoutAction = {
  type: typeof DELETE_SAVED_LAYOUT;
  id: string;
};

export type LoadSavedLayoutAction = {
  type: typeof LOAD_SAVED_LAYOUT;
  id: string;
  // Reload even when this layout is already active, discarding edits.
  force: boolean;
};

export type ReceiveLayoutToLoadAction = {
  type: typeof RECEIVE_LAYOUT_TO_LOAD;
  name: string;
  code: string;
};

export type LayoutLoadedAction = {
  type: typeof LAYOUT_LOADED;
};

export type SetSavedLayoutEditedAction = {
  type: typeof SET_SAVED_LAYOUT_EDITED;
  edited: boolean;
};

export type SettingsAction =
  | ReceiveLayoutPresetAction
  | ReceiveSavedLayoutsAction
  | ReceiveLayoutToLoadAction
  | LayoutLoadedAction
  | SetSavedLayoutEditedAction;
