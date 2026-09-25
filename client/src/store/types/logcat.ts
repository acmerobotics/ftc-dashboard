export const RECEIVE_LOGCAT_ERRORS = 'RECEIVE_LOGCAT_ERRORS';
export const CLEAR_LOGCAT_ERRORS = 'CLEAR_LOGCAT_ERRORS';

export interface LogcatError {
  timestamp: number;
  /** FtcDashboard sends logcat's letter: E, W, I, D, V, or F and A if fatal. */
  level:
    | 'ERROR'
    | 'WARN'
    | 'INFO'
    | 'DEBUG'
    | 'VERBOSE'
    | 'E'
    | 'W'
    | 'I'
    | 'D'
    | 'V'
    | 'F'
    | 'A';
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
