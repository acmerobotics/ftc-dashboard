import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import BaseView, {
  BaseViewHeading,
  BaseViewBody,
  BaseViewIcons,
  BaseViewIconButton,
  BaseViewProps,
  BaseViewHeadingProps,
} from '@/components/views/BaseView';

import { ReactComponent as PlayIcon } from '@/assets/icons/play_arrow.svg';
import { ReactComponent as StopIcon } from '@/assets/icons/stop.svg';
import { ReactComponent as DownloadIcon } from '@/assets/icons/file_download.svg';
import { ReactComponent as DeleteIcon } from '@/assets/icons/delete_sweep.svg';

import { RootState } from '@/store/reducers';
import { LogcatError } from '@/store/types/logcat';
import {
  startLogRecording,
  stopLogRecording,
  clearLogRecording,
} from '@/store/actions/logRecorder';
import {
  formatTimestamp,
  getLevelColor,
} from '@/components/views/logcatFormat';

// How many entries the list will render at once; the recording itself and the
// downloaded file always hold everything
const INLINE_VIEW_LIMIT = 500;

const compileLogFile = (
  entries: LogcatError[],
  startTime: number | null,
  stopTime: number | null,
  truncated: boolean,
): string => {
  const header = [
    '# FTC Dashboard Control Hub logs',
    `# Recording started: ${
      startTime ? new Date(startTime).toISOString() : 'unknown'
    }`,
    `# Recording stopped: ${
      stopTime ? new Date(stopTime).toISOString() : 'unknown'
    }`,
    `# Entries: ${entries.length}${
      truncated ? ' (older entries dropped)' : ''
    }`,
    '# Line timestamps are the Control Hub clock, which need not agree with the recording times above',
    '',
  ].join('\n');

  const body = entries
    .map(
      (entry) =>
        `${new Date(entry.timestamp).toISOString()} ${entry.level}/${
          entry.tag
        }: ${entry.message}`,
    )
    .join('\n');

  return header + body + '\n';
};

type LogViewProps = BaseViewProps & BaseViewHeadingProps;

const LogView = ({ isDraggable = false, isUnlocked = false }: LogViewProps) => {
  const dispatch = useDispatch();

  const { isRecording, startTime, stopTime, entries, truncated, maxEntries } =
    useSelector((state: RootState) => state.logRecorder);
  const isConnected = useSelector(
    (state: RootState) => state.socket.isConnected,
  );

  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const logListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAutoScroll && logListRef.current) {
      logListRef.current.scrollTop = logListRef.current.scrollHeight;
    }
  }, [entries, isAutoScroll]);

  const hasFinishedRecording = !isRecording && stopTime !== null;
  const isTailOnly = entries.length > INLINE_VIEW_LIMIT;

  const downloadLogs = () => {
    const content = compileLogFile(entries, startTime, stopTime, truncated);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const stamp = new Date(startTime ?? Date.now())
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    const anchor = document.createElement('a');
    anchor.style.display = 'none';
    document.body.appendChild(anchor);

    anchor.href = url;
    anchor.download = `control-hub-logs-${stamp}.log`;
    anchor.click();
    anchor.remove();

    // Safari can still be reading the blob when click() returns.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const renderEntries = () => (
    <div
      ref={logListRef}
      className="flex-1 overflow-auto px-3 py-2 font-mono text-xs"
      style={{ minHeight: 0 }}
    >
      <div className="space-y-1">
        {entries.slice(-INLINE_VIEW_LIMIT).map((entry) => (
          <div key={entry.id} className="flex items-baseline space-x-2">
            <span className="shrink-0 text-gray-500 dark:text-gray-400">
              [{formatTimestamp(entry.timestamp)}]
            </span>
            <span
              className={`shrink-0 font-medium ${getLevelColor(entry.level)}`}
            >
              {entry.level}
            </span>
            <span className="shrink-0 text-gray-600 dark:text-gray-300">
              {entry.tag}
            </span>
            <pre className="overflow-x-auto whitespace-pre-wrap text-gray-800 dark:text-gray-200">
              {entry.message}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBody = () => {
    if (isRecording) {
      return (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b px-3 py-2 dark:border-gray-600">
            <span
              className="flex items-center text-sm font-medium"
              title={`Keeps the most recent ${maxEntries.toLocaleString()} lines - adjustable in Settings`}
            >
              <span className="mr-2 inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
              Recording - {entries.length.toLocaleString()} of max{' '}
              {maxEntries.toLocaleString()} line(s)
              {isTailOnly &&
                ` (showing last ${INLINE_VIEW_LIMIT} of ${entries.length.toLocaleString()})`}
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
          {entries.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-gray-500 dark:text-gray-400">
              <p>Waiting for logs from the Control Hub…</p>
            </div>
          ) : (
            renderEntries()
          )}
        </div>
      );
    }

    if (hasFinishedRecording) {
      if (entries.length === 0) {
        return (
          <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
            <p>No logs were captured during the recording.</p>
          </div>
        );
      }

      return (
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b px-3 py-2 dark:border-gray-600">
            <span className="text-sm font-medium">
              Captured {entries.length.toLocaleString()} line(s)
              {isTailOnly &&
                ` (showing last ${INLINE_VIEW_LIMIT} of ${entries.length.toLocaleString()})`}
              {truncated &&
                ' (older entries dropped - raise the limit in Settings)'}
            </span>
            <button
              className="rounded border border-gray-300 px-2 py-1 text-sm transition hover:border-gray-500 dark:border-slate-500 dark:hover:border-slate-300"
              onClick={downloadLogs}
            >
              Download .log
            </button>
          </div>
          {renderEntries()}
          {isTailOnly && (
            <div className="border-t px-3 py-2 text-xs text-gray-500 dark:border-gray-600 dark:text-gray-400">
              Download the file to view the full logs.
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="max-w-sm text-center">
          <p className="mb-1">
            Press start to begin capturing Control Hub logs.
          </p>
          <p className="mb-1 text-sm">
            Keeps the most recent {maxEntries.toLocaleString()} lines per
            recording - adjustable in Settings (gear icon, top right).
          </p>
          {!isConnected && (
            <p className="text-sm">
              (Not connected to the robot - logs will appear once connected)
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <BaseView className="flex flex-col overflow-hidden" isUnlocked={isUnlocked}>
      <div className="flex">
        <BaseViewHeading isDraggable={isDraggable}>Logcat</BaseViewHeading>
        <BaseViewIcons>
          {isRecording ? (
            <BaseViewIconButton
              title="Stop Recording"
              onClick={() => dispatch(stopLogRecording())}
            >
              <StopIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            </BaseViewIconButton>
          ) : (
            <BaseViewIconButton
              title="Start Recording"
              onClick={() => dispatch(startLogRecording())}
            >
              <PlayIcon className="h-6 w-6" />
            </BaseViewIconButton>
          )}
          <BaseViewIconButton
            title="Download Logs"
            className="disabled:opacity-40"
            onClick={downloadLogs}
            disabled={isRecording || entries.length === 0}
          >
            <DownloadIcon className="h-6 w-6" />
          </BaseViewIconButton>
          <BaseViewIconButton
            title="Clear Recording"
            className="disabled:opacity-40"
            onClick={() => dispatch(clearLogRecording())}
            disabled={isRecording || entries.length === 0}
          >
            <DeleteIcon className="h-6 w-6" />
          </BaseViewIconButton>
        </BaseViewIcons>
      </div>
      <BaseViewBody>{renderBody()}</BaseViewBody>
    </BaseView>
  );
};

export default LogView;
