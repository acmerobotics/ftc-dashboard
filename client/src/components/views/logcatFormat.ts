import { LogcatError } from '@/store/types/logcat';

export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
};

export const getLevelColor = (level: LogcatError['level']): string => {
  switch (level) {
    case 'ERROR':
      return 'text-red-600 dark:text-red-400';
    case 'WARN':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'INFO':
      return 'text-blue-600 dark:text-blue-400';
    case 'DEBUG':
      return 'text-green-600 dark:text-green-400';
    case 'VERBOSE':
      return 'text-purple-600 dark:text-purple-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
};
