import { 
  LogcatError, 
  ReceiveLogcatErrorsAction, 
  ClearLogcatErrorsAction,
  RECEIVE_LOGCAT_ERRORS,
  CLEAR_LOGCAT_ERRORS,
} from '../types/logcat';

export const receiveLogcatErrors = (errors: LogcatError[]): ReceiveLogcatErrorsAction => ({
  type: RECEIVE_LOGCAT_ERRORS,
  errors: errors,
});

export const clearLogcatErrors = (): ClearLogcatErrorsAction => ({
  type: CLEAR_LOGCAT_ERRORS,
});