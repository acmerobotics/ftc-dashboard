import {
  LogcatState,
  LogcatError,
  ReceiveLogcatErrorsAction,
  ClearLogcatErrorsAction,
  RECEIVE_LOGCAT_ERRORS,
  CLEAR_LOGCAT_ERRORS,
} from '@/store/types/logcat';

const initialState: LogcatState = {
  errors: [],
};

const LEVEL_NAMES = new Map<string, LogcatError['level']>([
  ['V', 'VERBOSE'],
  ['D', 'DEBUG'],
  ['I', 'INFO'],
  ['W', 'WARN'],
  ['E', 'ERROR'],
  ['F', 'ERROR'],
  ['A', 'ERROR'],
]);

// Helper function to group stack traces together
const groupStackTraces = (errors: LogcatError[]): LogcatError[] => {
  const grouped: LogcatError[] = [];

  for (let i = 0; i < errors.length; i++) {
    const error = errors[i];

    // Check if this error message looks like it's part of a stack trace
    const isStackTraceLine =
      error.message.match(/^\s*at\s+.*\(.*\)$/) ||
      error.message.match(/^\s*at\s+.*\(.*:\d+\)$/) ||
      error.message.match(/^\s*at\s+.*\(Native Method\)$/) ||
      error.message.match(/^\s*at\s+.*\(Unknown Source\)$/) ||
      error.message.match(/^\s*at\s+.*\(D8\$\$SyntheticClass:\d+\)$/) || // Android synthetic classes
      error.message.match(/^\s*at\s+/) || // More permissive "at" matching
      (error.message.startsWith('\t') && error.message.includes('at '));

    const isCausedByLine =
      error.message.match(/^\s*Caused by:\s+.*Exception/) ||
      error.message.match(/^\s*Caused by:\s+.*Error/);

    const isSuppressedLine =
      error.message.match(/^\s*Suppressed:\s+.*Exception/) ||
      error.message.match(/^\s*Suppressed:\s+.*Error/);

    const isMoreLine = error.message.match(/^\s*\.\.\.\s*\d+\s*more/);

    // Check if this looks like a continuation of an exception message
    const isExceptionContinuation =
      grouped.length > 0 &&
      (isStackTraceLine ||
        isCausedByLine ||
        isSuppressedLine ||
        isMoreLine ||
        // Match common Java package names at start of line (likely stack trace continuation)
        (error.message.match(/^\s*java\./) && !error.message.includes(': ')) ||
        (error.message.match(/^\s*android\./) &&
          !error.message.includes(': ')) ||
        (error.message.match(/^\s*com\./) && !error.message.includes(': ')) ||
        (error.message.match(/^\s*org\./) && !error.message.includes(': ')));

    if (isExceptionContinuation && grouped.length > 0) {
      const lastError = grouped[grouped.length - 1];
      // Only group if the timestamp is close (within 2 seconds) and same level/tag
      // Stack traces can span multiple log entries over a longer period
      const timeDiff = Math.abs(error.timestamp - lastError.timestamp);
      if (
        timeDiff <= 2000 &&
        error.level === lastError.level &&
        error.tag === lastError.tag
      ) {
        lastError.message += '\n' + error.message;
        continue;
      }
    }

    // This is a new error or doesn't fit grouping criteria
    grouped.push({ ...error });
  }

  return grouped;
};

type LogcatAction = ReceiveLogcatErrorsAction | ClearLogcatErrorsAction;

const logcatReducer = (
  state = initialState,
  action: LogcatAction,
): LogcatState => {
  switch (action.type) {
    case RECEIVE_LOGCAT_ERRORS: {
      const receivedErrors = action.errors.map((error) => ({
        ...error,
        level: LEVEL_NAMES.get(error.level) ?? error.level,
      }));
      const combinedErrors = [...state.errors, ...receivedErrors];
      const groupedErrors = groupStackTraces(combinedErrors);

      return {
        ...state,
        errors: groupedErrors.slice(-100), // Keep only last 100 errors
      };
    }
    case CLEAR_LOGCAT_ERRORS:
      return {
        ...state,
        errors: [],
      };
    default:
      return state;
  }
};

export default logcatReducer;
