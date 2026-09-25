import {
  LogRecorderAction,
  LogRecorderState,
  START_LOG_RECORDING,
  STOP_LOG_RECORDING,
  CLEAR_LOG_RECORDING,
  SET_MAX_LOG_ENTRIES,
  DEFAULT_MAX_RECORDED_ENTRIES,
  MIN_MAX_RECORDED_ENTRIES,
  MAX_MAX_RECORDED_ENTRIES,
} from '@/store/types/logRecorder';
import {
  RECEIVE_LOGCAT_LINES,
  ReceiveLogcatLinesAction,
} from '@/store/types/logcat';

const clampMaxEntries = (value: number): number => {
  if (!Number.isFinite(value)) {
    return DEFAULT_MAX_RECORDED_ENTRIES;
  }
  return Math.min(
    MAX_MAX_RECORDED_ENTRIES,
    Math.max(MIN_MAX_RECORDED_ENTRIES, Math.round(value)),
  );
};

const initialState: LogRecorderState = {
  isRecording: false,
  startTime: null,
  stopTime: null,
  entries: [],
  truncated: false,
  maxEntries: DEFAULT_MAX_RECORDED_ENTRIES,
  nextId: 0,
};

const logRecorderReducer = (
  state = initialState,
  action: LogRecorderAction | ReceiveLogcatLinesAction,
): LogRecorderState => {
  switch (action.type) {
    case START_LOG_RECORDING:
      return {
        ...state,
        isRecording: true,
        startTime: Date.now(),
        stopTime: null,
        entries: [],
        truncated: false,
      };
    case STOP_LOG_RECORDING:
      if (!state.isRecording) {
        return state;
      }
      return {
        ...state,
        isRecording: false,
        stopTime: Date.now(),
      };
    case CLEAR_LOG_RECORDING:
      return {
        ...state,
        isRecording: false,
        startTime: null,
        stopTime: null,
        entries: [],
        truncated: false,
      };
    case SET_MAX_LOG_ENTRIES: {
      const maxEntries = clampMaxEntries(action.maxEntries);
      // A finished recording is the user's only copy until they download it, so
      // the limit only bounds the capture that is still running.
      if (!state.isRecording) {
        return { ...state, maxEntries };
      }
      return {
        ...state,
        maxEntries,
        entries: state.entries.slice(-maxEntries),
        truncated: state.truncated || state.entries.length > maxEntries,
      };
    }
    case RECEIVE_LOGCAT_LINES: {
      if (!state.isRecording) {
        return state;
      }
      const newEntries = Array.isArray(action.lines) ? action.lines : [];
      if (newEntries.length === 0) {
        return state;
      }
      const combined = [
        ...state.entries,
        ...newEntries.map((entry, index) => ({
          ...entry,
          id: state.nextId + index,
        })),
      ];
      return {
        ...state,
        entries: combined.slice(-state.maxEntries),
        truncated: state.truncated || combined.length > state.maxEntries,
        nextId: state.nextId + newEntries.length,
      };
    }
    default:
      return state;
  }
};

export default logRecorderReducer;
