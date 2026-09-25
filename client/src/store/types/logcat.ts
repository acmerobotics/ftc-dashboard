export const RECEIVE_LOGCAT_ERRORS = 'RECEIVE_LOGCAT_ERRORS';
export const CLEAR_LOGCAT_ERRORS = 'CLEAR_LOGCAT_ERRORS';

export const START_LOGCAT_CAPTURE = 'START_LOGCAT_CAPTURE';
export const STOP_LOGCAT_CAPTURE = 'STOP_LOGCAT_CAPTURE';
export const RECEIVE_LOGCAT_LINES = 'RECEIVE_LOGCAT_LINES';

export interface LogcatError {
  timestamp: number;
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'VERBOSE';
  tag: string;
  message: string;
}

export interface LogcatState {
  errors: LogcatError[];
}

export interface ReceiveLogcatErrorsAction {
  type: typeof RECEIVE_LOGCAT_ERRORS;
  errors: LogcatError[];
}

export interface ClearLogcatErrorsAction {
  type: typeof CLEAR_LOGCAT_ERRORS;
}

export interface StartLogcatCaptureAction {
  type: typeof START_LOGCAT_CAPTURE;
}

export interface StopLogcatCaptureAction {
  type: typeof STOP_LOGCAT_CAPTURE;
}

export interface ReceiveLogcatLinesAction {
  type: typeof RECEIVE_LOGCAT_LINES;
  lines: LogcatError[];
}
