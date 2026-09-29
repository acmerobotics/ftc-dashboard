import { LayoutPresetType } from '@/enums/LayoutPreset';
import {
  DeleteSavedLayoutAction,
  GetLayoutPresetAction,
  GetSavedLayoutsAction,
  LayoutLoadedAction,
  LoadSavedLayoutAction,
  ReceiveLayoutPresetAction,
  ReceiveLayoutToLoadAction,
  ReceiveSavedLayoutsAction,
  SavedLayout,
  SaveLayoutAction,
  SaveLayoutPresetAction,
  SetSavedLayoutEditedAction,
  DELETE_SAVED_LAYOUT,
  GET_LAYOUT_PRESET,
  GET_SAVED_LAYOUTS,
  LAYOUT_LOADED,
  LOAD_SAVED_LAYOUT,
  RECEIVE_LAYOUT_PRESET,
  RECEIVE_LAYOUT_TO_LOAD,
  RECEIVE_SAVED_LAYOUTS,
  SAVE_LAYOUT,
  SAVE_LAYOUT_PRESET,
  SET_SAVED_LAYOUT_EDITED,
} from '@/store/types';

export const saveLayoutPreset = (
  preset: LayoutPresetType,
): SaveLayoutPresetAction => ({
  type: SAVE_LAYOUT_PRESET,
  preset,
});

export const receiveLayoutPreset = (
  preset: LayoutPresetType,
): ReceiveLayoutPresetAction => ({
  type: RECEIVE_LAYOUT_PRESET,
  preset,
});

export const getLayoutPreset = (): GetLayoutPresetAction => ({
  type: GET_LAYOUT_PRESET,
});

export const getSavedLayouts = (
  fromOtherTab = false,
): GetSavedLayoutsAction => ({
  type: GET_SAVED_LAYOUTS,
  fromOtherTab,
});

export const receiveSavedLayouts = (
  layouts: SavedLayout[],
  activeId: string | null,
): ReceiveSavedLayoutsAction => ({
  type: RECEIVE_SAVED_LAYOUTS,
  layouts,
  activeId,
});

export const saveLayout = (name: string, code: string): SaveLayoutAction => ({
  type: SAVE_LAYOUT,
  name,
  code,
});

export const deleteSavedLayout = (id: string): DeleteSavedLayoutAction => ({
  type: DELETE_SAVED_LAYOUT,
  id,
});

export const loadSavedLayout = (
  id: string,
  force = false,
): LoadSavedLayoutAction => ({
  type: LOAD_SAVED_LAYOUT,
  id,
  force,
});

export const receiveLayoutToLoad = (
  name: string,
  code: string,
): ReceiveLayoutToLoadAction => ({
  type: RECEIVE_LAYOUT_TO_LOAD,
  name,
  code,
});

export const layoutLoaded = (): LayoutLoadedAction => ({
  type: LAYOUT_LOADED,
});

export const setSavedLayoutEdited = (
  edited: boolean,
): SetSavedLayoutEditedAction => ({
  type: SET_SAVED_LAYOUT_EDITED,
  edited,
});
