import { Middleware } from 'redux';

import LayoutPreset, { LayoutPresetType } from '@/enums/LayoutPreset';
import { GET_LAYOUT_PRESET, SAVE_LAYOUT_PRESET, GET_GRAPH_VARIABLES, SAVE_GRAPH_VARIABLES } from '@/store/types';
import { receiveLayoutPreset } from '@/store/actions/settings';
import { receiveGraphVariables } from '@/store/actions/graph';
import { RootState } from '@/store/reducers';
import { DEFAULT_OPTIONS } from '@/components/views/GraphView/Graph';

const LAYOUT_PRESET_KEY = 'layoutPreset';
const GRAPH_VARIABLES_KEY = 'graphVariables';

const storageMiddleware: Middleware<Record<string, unknown>, RootState> =
  (store) => (next) => (action) => {
    switch (action.type) {
      case GET_LAYOUT_PRESET: {
        const preset =
          localStorage.getItem(LAYOUT_PRESET_KEY) || LayoutPreset.DEFAULT;

        store.dispatch(receiveLayoutPreset(preset as LayoutPresetType));

        break;
      }
      case SAVE_LAYOUT_PRESET: {
        localStorage.setItem(LAYOUT_PRESET_KEY, action.preset);

        store.dispatch(receiveLayoutPreset(action.preset));

        break;
      }
      case GET_GRAPH_VARIABLES: {
        const storedData = localStorage.getItem(GRAPH_VARIABLES_KEY);
        let selectedKeys: string[] = [];
        let windowMs = DEFAULT_OPTIONS.windowMs;

        if (storedData) {
          try {
            const parsed = JSON.parse(storedData);
            selectedKeys = parsed.selectedKeys || [];
            windowMs = parsed.windowMs || DEFAULT_OPTIONS.windowMs;
          } catch (e) {
            // If parsing fails, use defaults
            console.warn('Failed to parse stored graph variables, using defaults');
          }
        }

        store.dispatch(receiveGraphVariables(selectedKeys, windowMs));

        break;
      }
      case SAVE_GRAPH_VARIABLES: {
        const graphData = {
          selectedKeys: action.selectedKeys,
          windowMs: action.windowMs,
        };
        localStorage.setItem(GRAPH_VARIABLES_KEY, JSON.stringify(graphData));

        store.dispatch(receiveGraphVariables(action.selectedKeys, action.windowMs));

        break;
      }
      default:
        next(action);

        break;
    }
  };

export default storageMiddleware;
