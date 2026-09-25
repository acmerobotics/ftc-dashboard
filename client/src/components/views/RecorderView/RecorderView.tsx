import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import clsx from 'clsx';

import BaseView, {
  BaseViewBody,
  BaseViewHeading,
  BaseViewHeadingProps,
  BaseViewProps,
} from '@/components/views/BaseView';
import {
  compareSelected,
  exitPlayback,
  libraryListed,
  loadRecording,
  pausePlayback,
  playPlayback,
  recordingRenamed,
  seekPlayback,
  selectRecordings,
  setAutoSelect,
  setCompareOnStart,
  setGhostOpacity,
  setPlaybackError,
  setPlaybackLoop,
  setPlaybackMode,
  setPlaybackSpeed,
  setRecorderEnabled,
  startRecording,
  stopRecording,
} from '@/store/actions/playback';
import {
  describeStorageError,
  exportFile,
  importFile,
  list,
  RecordingListEntry,
  remove,
  storageWarning,
  updateMeta,
  usage,
} from '@/store/recording/recordingStore';
import { GHOST_COLOURS } from '@/store/recording/ghosts';
import { formatBytes, formatClock } from '@/store/recording/timeFormat';
import { RootState } from '@/store/reducers';

import RecordingLibrary from './RecordingLibrary';
import TransportBar from './TransportBar';
import { SMALL_BUTTON, SMALL_BUTTON_FIXED } from './controlStyles';

type RecorderViewProps = BaseViewProps & BaseViewHeadingProps;

/** A hoverable dot, for a sentence explaining a label rather than being one. */
const HelpMark = () => (
  <span
    className={
      'ml-1 inline-flex h-3.5 w-3.5 cursor-help select-none items-center ' +
      'justify-center rounded-full border align-[-0.1em] text-[9px] ' +
      'border-gray-400 font-bold leading-none text-gray-500 ' +
      'dark:border-slate-500 dark:text-slate-400'
    }
    aria-hidden
  >
    ?
  </span>
);

/**
 * What compare mode is currently doing, as a short line plus the reason behind
 * it. Alignment is the whole claim of this mode, so the state itself stays on
 * screen; only the explanation moves to the tooltip.
 */
function alignState(playback: RootState['playback']): {
  label: string;
  detail: string;
} {
  if (playback.durationMs > 0 && playback.cursorMs >= playback.durationMs) {
    const several = playback.overlays.length > 0;
    return {
      label: several ? 'Recordings have run out' : 'Recording has run out',
      detail: `The live robot is still going; the recorded ${
        several ? 'paths stay' : 'path stays'
      } on screen.`,
    };
  }

  switch (playback.align.status) {
    case 'manual':
      return {
        label: 'Not following the robot',
        detail:
          'You moved the playhead. Press Play to line it up with the live run again.',
      };
    case 'outrun':
      return {
        label: 'Not following the robot',
        detail:
          'The live run has gone past the end of this recording, so Play shows it from the start.',
      };
    case 'unaligned':
      return {
        label: 'Cannot line up automatically',
        detail:
          playback.align.source === 'joined'
            ? 'This recording began after its run started, so it has no start to key on.'
            : 'You joined after this run started, so there is no shared start to key on.',
      };
    case 'waiting':
      return {
        label: 'Waiting for the op mode to start',
        detail: 'This will line itself up as soon as a run begins.',
      };
    default:
      break;
  }

  if (playback.align.source === 'start') {
    return {
      label: 'Lined up on op mode start',
      detail:
        'Robot status is polled once a second, so this can be up to a second out.',
    };
  }
  if (playback.align.source === 'first-data') {
    return {
      label: 'Lined up on first data',
      detail: 'This recording has no op mode start in it to key on.',
    };
  }
  return {
    label: 'Lined up on the start of the recording',
    detail: 'Neither an op mode start nor any earlier data to key on.',
  };
}

/** How many go, and how many of those nothing else would ever delete. */
function deleteAllQuestion(count: number, kept: number, recording: boolean) {
  let question: string;
  if (count === 1) {
    question =
      kept === 1
        ? 'Delete the only recording? It was kept for good, so it would ' +
          'never be deleted automatically.'
        : 'Delete the only recording?';
  } else if (kept === 0) {
    question = `Delete all ${count} recordings?`;
  } else if (kept === count) {
    question =
      `Delete all ${count} recordings? Every one was kept for good, so ` +
      'none would ever be deleted automatically.';
  } else {
    question =
      `Delete all ${count} recordings, including the ${kept} kept for ` +
      'good, which would never be deleted automatically?';
  }

  return (
    `${question} This cannot be undone.` +
    (recording ? ' The run being recorded now is not deleted.' : '')
  );
}

/** The engine's `ghost` and `playback` modes. Its third, `live`, is not a
 *  choice here: it is having no recording open, which Close returns you to. */
const VIEW_OPTIONS = [
  {
    mode: 'playback' as const,
    label: 'Play it back',
    hint: 'Field, Graph, Telemetry and Logging all show the recording. Live data is paused until you close it.',
  },
  {
    mode: 'ghost' as const,
    label: 'Compare with live',
    hint: 'Lines this recording up with the live run and draws it over the Field and Graph, so you can see where the two diverge. Telemetry and Logging stay live.',
  },
];

const RecorderView = ({
  isDraggable = false,
  isUnlocked = false,
}: RecorderViewProps) => {
  const dispatch = useDispatch();
  const playback = useSelector((state: RootState) => state.playback);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [entries, setEntries] = useState<RecordingListEntry[]>([]);
  /**
   * A file is being dragged over the panel.
   *
   * Counted rather than boolean: dragenter and dragleave both fire when the
   * pointer crosses between children, so a flag flickers off mid-drag.
   */
  const [dragDepth, setDragDepth] = useState(0);
  const [confirmingDeleteAll, setConfirmingDeleteAll] = useState(false);
  const [storage, setStorage] = useState<{
    usage: number;
    quota: number;
  } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const listed = await list();
      setEntries(listed);
      dispatch(libraryListed(listed.map((e) => e.meta)));
    } catch (err) {
      dispatch(
        setPlaybackError(
          `Could not read saved recordings: ${describeStorageError(err)}`,
        ),
      );
    }
    setStorage(await usage());
  }, [dispatch]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // A finished recording only appears in the library once it has been written.
  useEffect(() => {
    if (playback.recorder.savedCount > 0) void refresh();
  }, [playback.recorder.savedCount, refresh]);

  useEffect(() => {
    if (playback.libraryVersion > 0) void refresh();
  }, [playback.libraryVersion, refresh]);

  const isOpen = playback.recordingId !== null;
  const isPlaybackMode = playback.mode === 'playback';
  const recordingNowId = playback.recorder.active ? playback.recorder.id : null;
  const comparable = playback.selectedIds.filter((id) => id !== recordingNowId);
  const alsoSelected = comparable.filter((id) => id !== playback.recordingId);
  const joinedSelected = alsoSelected.filter((id) =>
    entries.some((e) => e.meta.id === id && e.meta.joined),
  ).length;
  const drawable = alsoSelected.length - joinedSelected;
  const deletable = entries.filter((e) => e.meta.id !== recordingNowId);
  const keptCount = deletable.filter((e) => e.meta.pinned).length;

  const handleSeek = useCallback(
    (t: number) => dispatch(seekPlayback(t)),
    [dispatch],
  );

  const handleStep = useCallback(
    (deltaMs: number) => dispatch(seekPlayback(playback.cursorMs + deltaMs)),
    [dispatch, playback.cursorMs],
  );

  const handleKeyDown = useCallback(
    (evt: React.KeyboardEvent) => {
      if (!isOpen) return;
      // Only act when the tile itself has focus. Otherwise Space on a focused
      // button inside the view gets preventDefault()'d here and never activates
      // the button.
      if (evt.target !== evt.currentTarget) return;

      const step = evt.shiftKey ? 1000 : 100;
      switch (evt.key) {
        case ' ':
          evt.preventDefault();
          dispatch(playback.isPlaying ? pausePlayback() : playPlayback());
          break;
        case 'ArrowLeft':
          evt.preventDefault();
          handleStep(-step);
          break;
        case 'ArrowRight':
          evt.preventDefault();
          handleStep(step);
          break;
        case 'Home':
          handleSeek(0);
          break;
        case 'End':
          handleSeek(playback.durationMs);
          break;
        default:
          break;
      }
    },
    [
      dispatch,
      handleSeek,
      handleStep,
      isOpen,
      playback.durationMs,
      playback.isPlaying,
    ],
  );

  const reportError = useCallback(
    (what: string) => (err: unknown) => {
      dispatch(setPlaybackError(`${what}: ${describeStorageError(err)}`));
    },
    [dispatch],
  );

  // Stable identities, so RecordingLibrary's memo holds while the cursor
  // ticks at 10 Hz.
  const handleSelect = useCallback(
    (id: string) => dispatch(loadRecording(id)),
    [dispatch],
  );

  const handleToggleSelected = useCallback(
    (id: string) => {
      const selected = new Set(playback.selectedIds);
      if (!selected.delete(id)) selected.add(id);
      dispatch(
        selectRecordings(
          entries.map((e) => e.meta.id).filter((x) => selected.has(x)),
        ),
      );
    },
    [dispatch, entries, playback.selectedIds],
  );

  const handleDelete = useCallback(
    (id: string) => {
      void (async () => {
        if (id === playback.recordingId) dispatch(exitPlayback());
        await remove(id);
        await refresh();
      })().catch(reportError('Could not delete that recording'));
    },
    [dispatch, playback.recordingId, refresh, reportError],
  );

  const handleDeleteAll = () => {
    setConfirmingDeleteAll(false);
    const ids = deletable.map((e) => e.meta.id);
    void (async () => {
      if (playback.recordingId !== null && ids.includes(playback.recordingId)) {
        dispatch(exitPlayback());
      }
      const failed = (await Promise.allSettled(ids.map(remove))).filter(
        (r): r is PromiseRejectedResult => r.status === 'rejected',
      );
      await refresh();
      if (failed.length > 0) {
        reportError(`Could not delete ${failed.length} of the recordings`)(
          failed[0].reason,
        );
      }
    })();
  };

  const handleRename = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (trimmed === '') return;

      void (async () => {
        // Renaming signals that a run is worth keeping, so it also pins it.
        await updateMeta(id, { name: trimmed, pinned: true });
        dispatch(recordingRenamed(id, trimmed));
        await refresh();
      })().catch(reportError('Could not rename that recording'));
    },
    [dispatch, refresh, reportError],
  );

  const handleExport = useCallback(
    (id: string) => {
      void exportFile(id)
        .catch(reportError('Could not export that recording'))
        .then(refresh);
    },
    [refresh, reportError],
  );

  const handleImport = async (files: FileList | null) => {
    if (!files) return;

    for (const file of Array.from(files)) {
      try {
        await importFile(file);
      } catch (err) {
        dispatch(
          setPlaybackError(
            `Could not import ${file.name}: ${describeStorageError(err)}`,
          ),
        );
      }
    }
    await refresh();
  };

  const hasFiles = (e: React.DragEvent) =>
    Array.from(e.dataTransfer?.types ?? []).includes('Files');

  return (
    <BaseView
      // The drop hint is absolutely positioned inside this panel, and BaseView
      // is not itself a positioning context.
      className="relative"
      isUnlocked={isUnlocked}
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      // Dropping a file is the natural way to open a recording someone sent
      // you, and unlike the file picker it is something the panel can actually
      // show: the drop target is this panel, so it can say so.
      onDragEnter={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setDragDepth((d) => d + 1);
      }}
      onDragOver={(e) => {
        if (!hasFiles(e)) return;
        // Without this the browser navigates to the file instead.
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={(e) => {
        if (!hasFiles(e)) return;
        setDragDepth((d) => Math.max(0, d - 1));
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setDragDepth(0);
        void handleImport(e.dataTransfer.files);
      }}
    >
      {dragDepth > 0 && (
        <div className="pointer-events-none absolute inset-2 z-30 flex items-center justify-center rounded-lg border-2 border-dashed border-primary-500 bg-primary-500/10">
          <p className="rounded bg-primary-600 px-3 py-1 text-sm font-medium text-white">
            Drop to import
          </p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <BaseViewHeading isDraggable={isDraggable}>Recorder</BaseViewHeading>
        {playback.recorder.active && (
          <span className="mr-4 flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs font-medium text-red-600 dark:text-red-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            Recording {formatClock(playback.recorder.elapsedMs)}
          </span>
        )}
      </div>

      <BaseViewBody>
        {playback.error && (
          <p className="error mb-2 text-sm" role="alert">
            {playback.error}{' '}
            <button
              className="underline"
              onClick={() => dispatch(setPlaybackError(null))}
            >
              dismiss
            </button>
          </p>
        )}

        {storageWarning() && (
          <p className="warning mb-2 text-sm">{storageWarning()}</p>
        )}

        {/* Everything about reviewing a recording lives in one panel that only
            exists while one is open, so the idle view is just a list. */}
        {isOpen && (
          <section className="mb-4 rounded-md border border-amber-500/60 bg-amber-50/60 p-2 dark:bg-amber-500/5">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h3 className="min-w-0 truncate text-sm font-medium">
                <span className="text-gray-500 dark:text-slate-400">
                  {/* The word the header bar uses for the same state. */}
                  {isPlaybackMode ? 'Reviewing' : 'Comparing'}{' '}
                </span>
                {playback.meta?.name}
              </h3>
              <button
                className={SMALL_BUTTON_FIXED}
                onClick={() => dispatch(exitPlayback())}
              >
                Close recording
              </button>
            </div>

            {/* Alignment is the whole claim of this mode, so it has to say
                which state it is in. The failure everyone hits is comparing
                against a run that has not started yet. */}
            {playback.mode === 'ghost' && (
              <p
                className="mb-2 text-xs text-gray-500 dark:text-slate-400"
                title={alignState(playback).detail}
              >
                {alignState(playback).label}
              </p>
            )}

            {playback.mode === 'ghost' && playback.overlays.length > 0 && (
              <ul
                className="mb-2 space-y-0.5 text-xs"
                title="Each is lined up on its own op mode start. The Graph shows only the open one."
              >
                {[
                  {
                    id: playback.recordingId,
                    name: playback.meta?.name,
                    colour: GHOST_COLOURS[0],
                  },
                  ...playback.overlays,
                ].map((g) => (
                  <li key={g.id} className="flex min-w-0 items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: g.colour }}
                    />
                    <span className="truncate">{g.name}</span>
                    {g.id === playback.recordingId && (
                      <span className="shrink-0 text-gray-500 dark:text-slate-400">
                        open
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {playback.mode === 'ghost' && joinedSelected > 0 && (
              <p className="mb-2 text-xs text-gray-500 dark:text-slate-400">
                {joinedSelected === 1
                  ? 'One selected recording is not drawn: it began after its run started, so it cannot be lined up.'
                  : `${joinedSelected} selected recordings are not drawn: they began after their runs started, so they cannot be lined up.`}
              </p>
            )}
            {playback.mode === 'ghost' &&
              drawable > GHOST_COLOURS.length - 1 && (
                <p className="mb-2 text-xs text-gray-500 dark:text-slate-400">
                  At most {GHOST_COLOURS.length} are drawn at once: this one and
                  the newest {GHOST_COLOURS.length - 1} selected.
                </p>
              )}
            {isPlaybackMode && drawable > 0 && (
              <p className="mb-2 text-xs text-gray-500 dark:text-slate-400">
                {drawable === 1
                  ? 'One other selected recording is'
                  : `${Math.min(
                      drawable,
                      GHOST_COLOURS.length - 1,
                    )} other selected recordings are`}{' '}
                drawn too when you compare with live.
              </p>
            )}

            {playback.recorder.active && (
              <p className="mb-2 text-xs text-gray-500 dark:text-slate-400">
                Live robot still being recorded
              </p>
            )}

            <TransportBar
              cursorMs={playback.cursorMs}
              durationMs={playback.durationMs}
              isPlaying={playback.isPlaying}
              speed={playback.speed}
              loop={playback.loop}
              markers={playback.markers}
              statusTimeline={playback.statusTimeline}
              density={playback.density}
              onSeek={handleSeek}
              onPlay={() => dispatch(playPlayback())}
              onPause={() => dispatch(pausePlayback())}
              onSetSpeed={(s) => dispatch(setPlaybackSpeed(s))}
              onSetLoop={(l) => dispatch(setPlaybackLoop(l))}
              onStep={handleStep}
              followsLive={playback.mode === 'ghost'}
              following={playback.align.status === 'aligned'}
            />

            <div className="mt-3 border-t border-gray-200 pt-2 dark:border-slate-600">
              <p className="mb-1 text-xs text-gray-500 dark:text-slate-400">
                Show this recording
              </p>
              <div className="flex rounded border border-gray-300 dark:border-slate-600">
                {VIEW_OPTIONS.map((o) => (
                  <button
                    key={o.mode}
                    title={o.hint}
                    className={clsx(
                      'flex-1 py-1 px-2 text-sm transition first:rounded-l last:rounded-r',
                      playback.mode === o.mode
                        ? 'bg-primary-600 font-medium text-white'
                        : 'hover:bg-white dark:hover:bg-slate-700',
                    )}
                    onClick={() => dispatch(setPlaybackMode(o.mode))}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {playback.mode === 'ghost' && (
                <label
                  className="mt-2 flex items-center gap-2 text-xs"
                  htmlFor="ghostOpacity"
                >
                  <span className="shrink-0">Field overlay opacity</span>
                  <input
                    id="ghostOpacity"
                    type="range"
                    className="flex-1"
                    min="0.05"
                    max="1"
                    step="0.05"
                    value={playback.ghostOpacity}
                    onChange={(e) =>
                      dispatch(setGhostOpacity(parseFloat(e.target.value)))
                    }
                  />
                  <span className="w-8 shrink-0 text-right font-mono">
                    {Math.round(playback.ghostOpacity * 100)}%
                  </span>
                </label>
              )}
            </div>
          </section>
        )}

        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-medium">Recordings</h3>
          <div className="flex items-center gap-2">
            {!isOpen && comparable.length > 0 && (
              <button
                className={SMALL_BUTTON}
                title="Draw the selected recordings over the live Field, each lined up on its op mode start"
                onClick={() => dispatch(compareSelected())}
              >
                Compare {comparable.length} with live
              </button>
            )}
            <input
              type="file"
              accept=".json"
              multiple
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                void handleImport(e.target.files);
                e.target.value = '';
              }}
            />
            <button
              className={SMALL_BUTTON}
              onClick={() => fileInputRef.current?.click()}
            >
              Import
            </button>
            {deletable.length > 0 && (
              <button
                className={SMALL_BUTTON}
                onClick={() => setConfirmingDeleteAll(true)}
              >
                Delete all
              </button>
            )}
          </div>
        </div>

        {confirmingDeleteAll && deletable.length > 0 && (
          <div
            className="mb-2 rounded border border-red-500/60 bg-red-50 p-2 text-sm dark:bg-red-500/10"
            role="alertdialog"
            aria-label="Delete all recordings"
          >
            <p>
              {deleteAllQuestion(
                deletable.length,
                keptCount,
                recordingNowId !== null,
              )}
            </p>
            <div className="mt-2 flex justify-end gap-2">
              <button
                className={SMALL_BUTTON}
                autoFocus
                onClick={() => setConfirmingDeleteAll(false)}
              >
                Cancel
              </button>
              <button
                className="rounded bg-red-600 px-2 py-0.5 text-xs font-medium text-white transition hover:bg-red-700"
                onClick={handleDeleteAll}
              >
                Delete {deletable.length}
              </button>
            </div>
          </div>
        )}

        <RecordingLibrary
          entries={entries}
          openId={playback.recordingId}
          selectedIds={playback.selectedIds}
          recordingNowId={recordingNowId}
          autoRecord={playback.recorder.enabled}
          onToggleSelected={handleToggleSelected}
          onSelect={handleSelect}
          onRename={handleRename}
          onDelete={handleDelete}
          onExport={handleExport}
        />

        {/* Capture settings are secondary: set once and forgotten. */}
        <div className="mt-4 border-t border-gray-200 pt-2 dark:border-slate-600">
          <h3 className="mb-1 font-medium">Capture</h3>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="rounded text-primary-600"
                checked={playback.recorder.enabled}
                onChange={(e) => dispatch(setRecorderEnabled(e.target.checked))}
              />
              Record op modes automatically
            </label>
            <button
              className={SMALL_BUTTON}
              title={
                playback.recorder.active
                  ? 'Stop this recording'
                  : 'Start a recording without waiting for an op mode'
              }
              onClick={() =>
                dispatch(
                  playback.recorder.active ? stopRecording() : startRecording(),
                )
              }
            >
              {playback.recorder.active ? 'Stop recording' : 'Record now'}
            </button>
          </div>

          {playback.recorder.enabled && playback.recorder.elsewhere && (
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              Another dashboard tab is recording op modes.
            </p>
          )}

          {playback.recorder.active ? (
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              {playback.recorder.frames.toLocaleString()} frames,{' '}
              {formatBytes(playback.recorder.bytes)} so far
            </p>
          ) : (
            <p
              className="mt-1 text-xs text-gray-500 dark:text-slate-400"
              title={
                'Automatic recordings are deleted oldest first once there ' +
                'are more than 10. Renaming or downloading one keeps it for ' +
                'good, and so does anything you imported.'
              }
            >
              {storage
                ? `Using ${formatBytes(storage.usage)} of browser storage`
                : `Recordings take about ${formatBytes(
                    entries.reduce((sum, e) => sum + e.meta.bytes, 0),
                  )}`}
              <HelpMark />
            </p>
          )}
        </div>

        <div className="mt-4 border-t border-gray-200 pt-2 dark:border-slate-600">
          <h3 className="mb-1 font-medium">Comparing</h3>
          <label
            className="flex items-center gap-2 text-sm"
            title="As an op mode is initialised, the selected recordings open in compare mode and line up on its start."
          >
            <input
              type="checkbox"
              className="rounded text-primary-600"
              checked={playback.compareOnStart}
              onChange={(e) => dispatch(setCompareOnStart(e.target.checked))}
            />
            Compare the selected recordings when an op mode starts
          </label>
          <label
            className="flex items-center gap-2 text-sm"
            title="Whenever the list changes, every saved recording is ticked, new ones included."
          >
            <input
              type="checkbox"
              className="rounded text-primary-600"
              checked={playback.autoSelect}
              onChange={(e) => dispatch(setAutoSelect(e.target.checked))}
            />
            Select every recording automatically
          </label>
        </div>
      </BaseViewBody>
    </BaseView>
  );
};

export default RecorderView;
