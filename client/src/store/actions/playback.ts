import type { Dispatch } from 'redux';

import type {
  Marker,
  RecordingMeta,
  StatusSample,
} from '@/store/recording/format';
import {
  AUTO_SELECT_KEY,
  COMPARE_ON_START_KEY,
  RECORDER_ENABLED_KEY,
} from '@/store/reducers/playback';
import { LIBRARY_CHANGED_KEY } from '@/store/recording/recordingStore';
import {
  GhostOverlay,
  PlaybackCompareSelectedAction,
  PlaybackLibraryChangedAction,
  PlaybackLibraryListedAction,
  PlaybackOverlaysAction,
  PlaybackRenamedAction,
  PlaybackSelectAction,
  PlaybackSetAutoSelectAction,
  PlaybackSetCompareOnStartAction,
  PLAYBACK_COMPARE_SELECTED,
  PLAYBACK_LIBRARY_CHANGED,
  PLAYBACK_LIBRARY_LISTED,
  PLAYBACK_OVERLAYS,
  PLAYBACK_RENAMED,
  PLAYBACK_SELECT,
  PLAYBACK_SET_AUTO_SELECT,
  PLAYBACK_SET_COMPARE_ON_START,
  PlaybackErrorAction,
  PlaybackSetAlignAction,
  AlignState,
  PlaybackResetFoldAction,
  PlaybackExitAction,
  PlaybackLoadAction,
  PlaybackLoadedAction,
  PlaybackMode,
  PlaybackPauseAction,
  PlaybackPlayAction,
  PlaybackSeekAction,
  PlaybackSetLoopAction,
  PlaybackSetModeAction,
  PlaybackSetOpacityAction,
  PlaybackSetSpeedAction,
  PlaybackTickAction,
  PLAYBACK_ERROR,
  PLAYBACK_SET_ALIGN,
  PLAYBACK_RECORDED_CLEAR,
  PLAYBACK_RESET_FOLD,
  PLAYBACK_EXIT,
  PLAYBACK_LOAD,
  PLAYBACK_LOADED,
  PLAYBACK_PAUSE,
  PLAYBACK_PLAY,
  PLAYBACK_SEEK,
  PLAYBACK_SET_LOOP,
  PLAYBACK_SET_MODE,
  PLAYBACK_SET_OPACITY,
  PLAYBACK_SET_SPEED,
  PLAYBACK_TICK,
  RecorderSetEnabledAction,
  RecorderStartAction,
  RecorderState,
  RecorderStateAction,
  RecorderStopAction,
  RECORDER_SET_ENABLED,
  RECORDER_START,
  RECORDER_STATE,
  RECORDER_STOP,
} from '@/store/types/playback';

export const loadRecording = (
  id: string,
  mode?: 'ghost',
): PlaybackLoadAction => ({
  type: PLAYBACK_LOAD,
  id,
  mode,
});

export const recordingLoaded = (
  meta: RecordingMeta,
  durationMs: number,
  markers: Marker[],
  statusTimeline: StatusSample[],
  density: number[],
  mode?: 'ghost',
): PlaybackLoadedAction => ({
  type: PLAYBACK_LOADED,
  mode,
  meta,
  durationMs,
  markers,
  statusTimeline,
  density,
});

export const playPlayback = (): PlaybackPlayAction => ({ type: PLAYBACK_PLAY });

export const followLiveRun = (): PlaybackPlayAction => ({
  type: PLAYBACK_PLAY,
  following: true,
});

export const pausePlayback = (): PlaybackPauseAction => ({
  type: PLAYBACK_PAUSE,
});

export const seekPlayback = (t: number): PlaybackSeekAction => ({
  type: PLAYBACK_SEEK,
  t,
});

export const tickPlayback = (cursorMs: number): PlaybackTickAction => ({
  type: PLAYBACK_TICK,
  cursorMs,
});

export const setPlaybackSpeed = (speed: number): PlaybackSetSpeedAction => ({
  type: PLAYBACK_SET_SPEED,
  speed,
});

export const setPlaybackMode = (mode: PlaybackMode): PlaybackSetModeAction => ({
  type: PLAYBACK_SET_MODE,
  mode,
});

export const setGhostOpacity = (opacity: number): PlaybackSetOpacityAction => ({
  type: PLAYBACK_SET_OPACITY,
  opacity,
});

export const setPlaybackLoop = (loop: boolean): PlaybackSetLoopAction => ({
  type: PLAYBACK_SET_LOOP,
  loop,
});

export const exitPlayback = (): PlaybackExitAction => ({ type: PLAYBACK_EXIT });

export const setAlign = (
  align: Partial<AlignState>,
): PlaybackSetAlignAction => ({
  type: PLAYBACK_SET_ALIGN,
  align,
});

export const setPlaybackError = (
  message: string | null,
): PlaybackErrorAction => ({
  type: PLAYBACK_ERROR,
  message,
});

/** Tells every telemetry-derived view to discard what it has accumulated. */
export const resetTelemetryFold = (): PlaybackResetFoldAction => ({
  type: PLAYBACK_RESET_FOLD,
});

/**
 * The recording contained a clear. Resets the telemetry key fold, and nothing
 * else -- see PlaybackState.clearToken.
 */
export const recordedClear = () => ({
  type: PLAYBACK_RECORDED_CLEAR as typeof PLAYBACK_RECORDED_CLEAR,
});

export const selectRecordings = (ids: string[]): PlaybackSelectAction => ({
  type: PLAYBACK_SELECT,
  ids,
});

/** Every saved recording, in library order, after the library is read. */
export const libraryListed = (
  metas: RecordingMeta[],
): PlaybackLibraryListedAction => ({
  type: PLAYBACK_LIBRARY_LISTED,
  ids: metas.map((m) => m.id),
  joined: metas.filter((m) => m.joined).map((m) => m.id),
  names: Object.fromEntries(metas.map((m) => [m.id, m.name])),
});

/** A recording turned out to be gone, so the library needs reading again. */
export const libraryChanged = (): PlaybackLibraryChangedAction => ({
  type: PLAYBACK_LIBRARY_CHANGED,
});

export const setAutoSelect = (
  enabled: boolean,
): PlaybackSetAutoSelectAction => ({
  type: PLAYBACK_SET_AUTO_SELECT,
  enabled,
});

export const setCompareOnStart = (
  enabled: boolean,
): PlaybackSetCompareOnStartAction => ({
  type: PLAYBACK_SET_COMPARE_ON_START,
  enabled,
});

/** Opens the selected recordings together in compare mode. */
export const compareSelected = (): PlaybackCompareSelectedAction => ({
  type: PLAYBACK_COMPARE_SELECTED,
});

export const overlaysChanged = (
  overlays: GhostOverlay[],
  durationMs: number,
  density: number[],
): PlaybackOverlaysAction => ({
  type: PLAYBACK_OVERLAYS,
  overlays,
  durationMs,
  density,
});

export const recordingRenamed = (
  id: string,
  name: string,
): PlaybackRenamedAction => ({
  type: PLAYBACK_RENAMED,
  id,
  name,
});

export const setRecorderState = (
  recorder: Partial<RecorderState>,
): RecorderStateAction => ({
  type: RECORDER_STATE,
  recorder,
});

export const setRecorderEnabled = (
  enabled: boolean,
): RecorderSetEnabledAction => ({
  type: RECORDER_SET_ENABLED,
  enabled,
});

/** Follows another tab on this robot: its recorder settings and its changes
 *  to the library. */
export function followOtherTabs(dispatch: Dispatch) {
  window.addEventListener('storage', (e) => {
    if (e.key === LIBRARY_CHANGED_KEY) dispatch(libraryChanged());
    if (e.newValue === null) return;
    const on = e.newValue === 'true';
    if (e.key === RECORDER_ENABLED_KEY) dispatch(setRecorderEnabled(on));
    if (e.key === AUTO_SELECT_KEY) dispatch(setAutoSelect(on));
    if (e.key === COMPARE_ON_START_KEY) dispatch(setCompareOnStart(on));
  });
}

export const startRecording = (): RecorderStartAction => ({
  type: RECORDER_START,
});

export const stopRecording = (): RecorderStopAction => ({
  type: RECORDER_STOP,
});
