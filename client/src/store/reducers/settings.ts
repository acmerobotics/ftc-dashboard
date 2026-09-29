import {
  SettingState,
  SettingsAction,
  LAYOUT_LOADED,
  RECEIVE_LAYOUT_PRESET,
  RECEIVE_LAYOUT_TO_LOAD,
  RECEIVE_SAVED_LAYOUTS,
  SET_SAVED_LAYOUT_EDITED,
} from '@/store/types';

const initialState: SettingState = {
  // TODO: this seems to be necessary to prevent
  // ReferenceError: can't access lexical declaration 'LayoutPreset' before initialization
  // perhaps due to the root reducer type shenanigans?
  layoutPreset: 'DEFAULT',
  savedLayouts: [],
  activeSavedLayout: null,
  layoutToLoad: null,
};

const settingsReducer = (
  state: SettingState = initialState,
  action: SettingsAction,
) => {
  switch (action.type) {
    case RECEIVE_LAYOUT_PRESET:
      return {
        ...state,
        layoutPreset: action.preset,
      };
    case RECEIVE_SAVED_LAYOUTS: {
      const active = state.activeSavedLayout;
      return {
        ...state,
        savedLayouts: action.layouts,
        activeSavedLayout:
          action.activeId === null
            ? null
            : {
                id: action.activeId,
                edited:
                  active !== null && active.id === action.activeId
                    ? active.edited
                    : false,
              },
        // A load that nothing has consumed yet is dropped on detach, so it
        // cannot surface later when the custom layout next mounts.
        layoutToLoad: action.activeId === null ? null : state.layoutToLoad,
      };
    }
    case RECEIVE_LAYOUT_TO_LOAD:
      return {
        ...state,
        layoutToLoad: { name: action.name, code: action.code },
        // The grid is about to match the saved code again.
        activeSavedLayout:
          state.activeSavedLayout === null
            ? null
            : { ...state.activeSavedLayout, edited: false },
      };
    case LAYOUT_LOADED:
      return {
        ...state,
        layoutToLoad: null,
      };
    case SET_SAVED_LAYOUT_EDITED:
      return state.activeSavedLayout === null
        ? state
        : {
            ...state,
            activeSavedLayout: {
              ...state.activeSavedLayout,
              edited: action.edited,
            },
          };
    default:
      return state;
  }
};

export default settingsReducer;
