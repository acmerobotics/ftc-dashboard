import { memo, useState } from 'react';
import clsx from 'clsx';

import { ReactComponent as CreateSVG } from '@/assets/icons/create.svg';
import { ReactComponent as DeleteSVG } from '@/assets/icons/delete.svg';
import { ReactComponent as DownloadSVG } from '@/assets/icons/file_download.svg';
import type { RecordingListEntry } from '@/store/recording/recordingStore';
import { formatBytes, formatClock } from '@/store/recording/timeFormat';
import { SMALL_BUTTON_FIXED } from './controlStyles';

type RecordingLibraryProps = {
  entries: RecordingListEntry[];
  /** The recording currently being reviewed, if any. */
  openId: string | null;
  /** Checked for compare mode, which draws each of them over the live Field. */
  selectedIds: string[];
  recordingNowId: string | null;
  autoRecord: boolean;
  onToggleSelected: (id: string) => void;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
};

/** One line of prose beats a row of colour-coded chips nobody can decode. */
function describe(entry: RecordingListEntry): string {
  const { meta, source } = entry;
  const parts: string[] = [];

  if (meta.durationMs > 0) parts.push(formatClock(meta.durationMs));

  if (source === 'legacy') {
    parts.push('field path only (older format)');
  } else {
    const channels = [
      meta.channels.telemetry && 'telemetry',
      meta.channels.field && 'field path',
    ].filter(Boolean);
    if (channels.length) parts.push(channels.join(' and '));
  }

  if (meta.bytes > 0) parts.push(formatBytes(meta.bytes));
  if (meta.origin === 'imported') parts.push('imported');

  return parts.join(' · ');
}

const RecordingLibrary = ({
  entries,
  openId,
  selectedIds,
  recordingNowId,
  autoRecord,
  onToggleSelected,
  onSelect,
  onRename,
  onDelete,
  onExport,
}: RecordingLibraryProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');

  if (entries.length === 0) {
    return (
      <p className="rounded border border-dashed border-gray-300 py-4 px-3 text-center text-sm text-gray-500 dark:border-slate-600 dark:text-slate-400">
        No recordings yet.{' '}
        {autoRecord
          ? 'Run an op mode and one is saved automatically, or import a file someone shared with you.'
          : 'Turn on Record op modes automatically below, press Record now, or import a file someone shared with you.'}
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {entries.map((entry) => {
        const { meta, source } = entry;
        const isOpen = meta.id === openId;
        const isRecording = meta.id === recordingNowId;

        return (
          <li
            key={meta.id}
            className={clsx(
              'flex items-center gap-1 rounded border p-2 transition',
              isOpen
                ? 'border-amber-500 bg-amber-50/60 dark:border-amber-500/70 dark:bg-amber-500/10'
                : 'border-gray-200 hover:border-gray-400 dark:border-slate-600 dark:hover:border-slate-400',
            )}
          >
            <input
              type="checkbox"
              className="mr-1 shrink-0 rounded text-primary-600 disabled:opacity-50"
              aria-label={`Compare ${meta.name}`}
              title={
                isOpen
                  ? 'Open, so it is always compared'
                  : isRecording
                  ? 'Still being recorded'
                  : 'Also draw this one when comparing with live'
              }
              checked={
                isOpen || (!isRecording && selectedIds.includes(meta.id))
              }
              disabled={isOpen || isRecording}
              onChange={() => onToggleSelected(meta.id)}
            />
            {editingId === meta.id ? (
              <input
                className="min-w-0 flex-1 rounded border-gray-300 py-0.5 px-1 text-sm dark:bg-slate-800"
                value={draftName}
                autoFocus
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={() => {
                  onRename(meta.id, draftName);
                  setEditingId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onRename(meta.id, draftName);
                    setEditingId(null);
                  } else if (e.key === 'Escape') {
                    setEditingId(null);
                  }
                }}
              />
            ) : (
              <button
                className="min-w-0 flex-1 text-left"
                onClick={() => onSelect(meta.id)}
                title={isOpen ? 'Already open' : 'Open this recording'}
              >
                <span className="block truncate text-sm font-medium">
                  {meta.name}
                </span>
                <span className="block truncate text-xs text-gray-500 dark:text-slate-400">
                  {describe(entry)}
                </span>
              </button>
            )}

            {isOpen ? (
              <span className="shrink-0 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-900">
                Open
              </span>
            ) : (
              <button
                className={SMALL_BUTTON_FIXED}
                onClick={() => onSelect(meta.id)}
              >
                Review
              </button>
            )}

            {source !== 'legacy' && editingId !== meta.id && (
              <button
                className="icon-btn h-7 w-7 shrink-0"
                title="Rename"
                onClick={() => {
                  setDraftName(meta.name);
                  setEditingId(meta.id);
                }}
              >
                <CreateSVG className="h-5 w-5" />
              </button>
            )}
            <button
              className="icon-btn h-7 w-7 shrink-0"
              title="Download as a file"
              onClick={() => onExport(meta.id)}
            >
              <DownloadSVG className="h-5 w-5" />
            </button>
            <button
              className="icon-btn h-7 w-7 shrink-0"
              title="Delete"
              onClick={() => onDelete(meta.id)}
            >
              <DeleteSVG className="h-5 w-5" />
            </button>
          </li>
        );
      })}
    </ul>
  );
};

// RecorderView re-renders at the cursor tick rate while a recording plays; the
// library list depends on none of that.
export default memo(RecordingLibrary);
