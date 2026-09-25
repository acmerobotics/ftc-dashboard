import { LogcatError } from './logcat';

export const START_LOG_RECORDING = 'START_LOG_RECORDING';
export const STOP_LOG_RECORDING = 'STOP_LOG_RECORDING';
export const CLEAR_LOG_RECORDING = 'CLEAR_LOG_RECORDING';
export const SET_MAX_LOG_ENTRIES = 'SET_MAX_LOG_ENTRIES';
export const GET_MAX_LOG_ENTRIES = 'GET_MAX_LOG_ENTRIES';

// Bounds a recording left running; the oldest entries are dropped past the
// cap, which Settings can move within these limits.
export const DEFAULT_MAX_RECORDED_ENTRIES = 10000;
export const MIN_MAX_RECORDED_ENTRIES = 100;
export const MAX_MAX_RECORDED_ENTRIES = 100000;

// Entries keep an id because the rolling window shifts every array index as
// soon as the buffer is full, which would churn index-derived React keys.
export interface RecordedLogEntry extends LogcatError {
  id: number;
}

export interface LogRecorderState {
  isRecording: boolean;
  startTime: number | null;
  stopTime: number | null;
  entries: RecordedLogEntry[];
  truncated: boolean;
  maxEntries: number;
  nextId: number;
}

export interface StartLogRecordingAction {
  type: typeof START_LOG_RECORDING;
}

export interface StopLogRecordingAction {
  type: typeof STOP_LOG_RECORDING;
}

export interface ClearLogRecordingAction {
  type: typeof CLEAR_LOG_RECORDING;
}

export interface SetMaxLogEntriesAction {
  type: typeof SET_MAX_LOG_ENTRIES;
  maxEntries: number;
}

export interface GetMaxLogEntriesAction {
  type: typeof GET_MAX_LOG_ENTRIES;
}

export type LogRecorderAction =
  | StartLogRecordingAction
  | StopLogRecordingAction
  | ClearLogRecordingAction
  | SetMaxLogEntriesAction
  | GetMaxLogEntriesAction;
