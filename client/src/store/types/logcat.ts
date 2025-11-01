export const RECEIVE_LOGCAT_ERRORS = 'RECEIVE_LOGCAT_ERRORS';
export const CLEAR_LOGCAT_ERRORS = 'CLEAR_LOGCAT_ERRORS';

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