import { Middleware } from 'redux';

import LayoutPreset, { LayoutPresetType } from '@/enums/LayoutPreset';
import { GET_LAYOUT_PRESET, SAVE_LAYOUT_PRESET } from '@/store/types';
import {
  GET_MAX_LOG_ENTRIES,
  SET_MAX_LOG_ENTRIES,
} from '@/store/types/logRecorder';
import { receiveLayoutPreset } from '@/store/actions/settings';
import { setMaxLogEntries } from '@/store/actions/logRecorder';
import { RootState } from '@/store/reducers';

const LAYOUT_PRESET_KEY = 'layoutPreset';
const MAX_LOG_ENTRIES_KEY = 'maxRecordedLogEntries';

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
      case GET_MAX_LOG_ENTRIES: {
        try {
          const stored = parseInt(
            localStorage.getItem(MAX_LOG_ENTRIES_KEY) ?? '',
            10,
          );

          if (!isNaN(stored)) {
            store.dispatch(setMaxLogEntries(stored));
          }
        } catch {
          // an unavailable localStorage leaves the default limit in place
        }

        break;
      }
      case SET_MAX_LOG_ENTRIES: {
        next(action);

        try {
          // the reducer holds the only range rule, so store what it settled on
          localStorage.setItem(
            MAX_LOG_ENTRIES_KEY,
            String(store.getState().logRecorder.maxEntries),
          );
        } catch {
          // the limit still applies for this session
        }

        break;
      }
      default:
        next(action);

        break;
    }
  };

export default storageMiddleware;
