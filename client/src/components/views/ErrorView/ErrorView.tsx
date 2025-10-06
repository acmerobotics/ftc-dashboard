import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import BaseView, {
  BaseViewHeading,
  BaseViewBody,
  BaseViewIcons,
  BaseViewIconButton,
  BaseViewProps,
  BaseViewHeadingProps,
} from '@/components/views/BaseView';

import { ReactComponent as DeleteIcon } from '@/assets/icons/delete_sweep.svg';

import { RootState } from '@/store/reducers';
import { LogcatError } from '@/store/types/logcat';
import { clearLogcatErrors } from '@/store/actions/logcat';

type ErrorViewProps = BaseViewProps & BaseViewHeadingProps;

const ErrorView = ({
  isDraggable = false,
  isUnlocked = false,
}: ErrorViewProps) => {
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const errorListRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch();

  const logcatErrors = useSelector((state: RootState) => state.logcat.errors);

  // Filter errors to only show OpModeManager tag
  const opModeManagerErrors = logcatErrors.filter(error => 
    error.tag === 'OpModeManager'
  );

  useEffect(() => {
    if (isAutoScroll && errorListRef.current) {
      errorListRef.current.scrollTop = errorListRef.current.scrollHeight;
    }
  }, [opModeManagerErrors, isAutoScroll]);

  const handleClearErrors = () => {
    dispatch(clearLogcatErrors());
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  const getLevelColor = (level: LogcatError['level']): string => {
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

  const formatStackTrace = (message: string): string => {
    const lines = message.split('\n');
    return lines.map((line, index) => {
      // Main exception line (first line) - no indentation
      if (index === 0) {
        return line;
      }
      
      // Stack trace "at" lines - add indentation if not already present
      if (line.match(/^\s*at\s+/)) {
        return line.startsWith('    ') || line.startsWith('\t') ? line : `    ${line.trim()}`;
      }
      
      // "Caused by:" lines - add small indentation
      if (line.match(/^\s*Caused by:/)) {
        return line.startsWith('  ') ? line : `  ${line.trim()}`;
      }
      
      // "Suppressed:" lines - add small indentation
      if (line.match(/^\s*Suppressed:/)) {
        return line.startsWith('  ') ? line : `  ${line.trim()}`;
      }
      
      // "... N more" lines - add indentation
      if (line.match(/^\s*\.\.\.\s*\d+\s*more/)) {
        return line.startsWith('    ') || line.startsWith('\t') ? line : `    ${line.trim()}`;
      }
      
      // Lines that are already indented or other continuation lines
      return line;
    }).join('\n');
  };

  return (
    <BaseView
      className="flex flex-col overflow-hidden"
      isUnlocked={isUnlocked}
    >
      <div className="flex">
        <BaseViewHeading isDraggable={isDraggable}>
          Error View
        </BaseViewHeading>
        <BaseViewIcons>
          <BaseViewIconButton
            title="Clear All Errors"
            onClick={handleClearErrors}
          >
            <DeleteIcon className="h-6 w-6" />
          </BaseViewIconButton>
        </BaseViewIcons>
      </div>
      <BaseViewBody>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-3 py-2 border-b dark:border-gray-600">
            <span className="text-sm font-medium">
              {opModeManagerErrors.length} error(s) found
            </span>
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={isAutoScroll}
                onChange={(e) => setIsAutoScroll(e.target.checked)}
                className="mr-2"
              />
              Auto-scroll
            </label>
          </div>
          <div
            ref={errorListRef}
            className="flex-1 overflow-auto px-3 py-2 font-mono text-xs"
            style={{ minHeight: 0 }}
          >
            {opModeManagerErrors.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <p>This view monitors Logcat for OpModeManager errors</p>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {opModeManagerErrors.map((error, index) => {
                  const isMultiLineError = error.message.includes('\n');
                  
                  return (
                    <div
                      key={`${error.timestamp}-${index}`}
                      className="border-b border-gray-200 dark:border-gray-700 pb-3 mb-3 last:border-b-0 last:mb-0"
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-gray-500 dark:text-gray-400 text-xs font-mono">
                          [{formatTimestamp(error.timestamp)}]
                        </span>
                        <span className={`font-medium text-xs px-2 py-1 rounded ${getLevelColor(error.level)} ${
                          error.level === 'ERROR' ? 'bg-red-100 dark:bg-red-900/20' :
                          error.level === 'WARN' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                          error.level === 'INFO' ? 'bg-blue-100 dark:bg-blue-900/20' :
                          error.level === 'DEBUG' ? 'bg-green-100 dark:bg-green-900/20' :
                          'bg-gray-100 dark:bg-gray-900/20'
                        }`}>
                          {error.level}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-300 font-mono">
                          {error.tag}
                        </span>
                      </div>
                      <div className={`pl-4 text-gray-800 dark:text-gray-200 ${isMultiLineError ? 'bg-gray-50 dark:bg-gray-800 rounded p-3' : ''}`}>
                        <pre 
                          className="whitespace-pre font-mono text-xs leading-relaxed overflow-x-auto"
                          style={{ 
                            tabSize: 4,
                            whiteSpace: 'pre',
                            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                          } as React.CSSProperties}
                        >
                          {formatStackTrace(error.message)}
                        </pre>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </BaseViewBody>
    </BaseView>
  );
};

export default ErrorView;