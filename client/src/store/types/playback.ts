import type {
  Marker,
  RecordingMeta,
  StatusSample,
} from '@/store/recording/format';

export const PLAYBACK_LOAD = 'PLAYBACK_LOAD';
export const PLAYBACK_LOADED = 'PLAYBACK_LOADED';
export const PLAYBACK_PLAY = 'PLAYBACK_PLAY';
export const PLAYBACK_PAUSE = 'PLAYBACK_PAUSE';
export const PLAYBACK_SEEK = 'PLAYBACK_SEEK';
export const PLAYBACK_TICK = 'PLAYBACK_TICK';
export const PLAYBACK_SET_SPEED = 'PLAYBACK_SET_SPEED';
export const PLAYBACK_SET_MODE = 'PLAYBACK_SET_MODE';
export const PLAYBACK_SET_OPACITY = 'PLAYBACK_SET_OPACITY';
export const PLAYBACK_SET_LOOP = 'PLAYBACK_SET_LOOP';
export const PLAYBACK_EXIT = 'PLAYBACK_EXIT';
export const PLAYBACK_SET_ALIGN = 'PLAYBACK_SET_ALIGN';
export const PLAYBACK_ERROR = 'PLAYBACK_ERROR';
export const PLAYBACK_RESET_FOLD = 'PLAYBACK_RESET_FOLD';
export const PLAYBACK_RECORDED_CLEAR = 'PLAYBACK_RECORDED_CLEAR';
export const PLAYBACK_SELECT = 'PLAYBACK_SELECT';
export const PLAYBACK_LIBRARY_LISTED = 'PLAYBACK_LIBRARY_LISTED';
export const PLAYBACK_LIBRARY_CHANGED = 'PLAYBACK_LIBRARY_CHANGED';
export const PLAYBACK_COMPARE_SELECTED = 'PLAYBACK_COMPARE_SELECTED';
export const PLAYBACK_OVERLAYS = 'PLAYBACK_OVERLAYS';
export const PLAYBACK_RENAMED = 'PLAYBACK_RENAMED';
export const PLAYBACK_SET_AUTO_SELECT = 'PLAYBACK_SET_AUTO_SELECT';
export const PLAYBACK_SET_COMPARE_ON_START = 'PLAYBACK_SET_COMPARE_ON_START';
export const RECORDER_STATE = 'RECORDER_STATE';
export const RECORDER_SET_ENABLED = 'RECORDER_SET_ENABLED';
export const RECORDER_START = 'RECORDER_START';
export const RECORDER_STOP = 'RECORDER_STOP';

/** `ghost` blends field ops over live data; `playback` gates live telemetry. */
export type PlaybackMode = 'live' | 'ghost' | 'playback';

/** Ties the recording's clock to the live run's; without it, the playhead
 *  anchors to whenever Play was pressed. */
export type AlignState = {
  recAnchorMs: number | null;
  /** A sharper start than the 1 Hz status track: the robot telemeters within a
   *  frame of START. Null when no such frame sits just before the edge. */
  recSnapMs: number | null;
  liveAnchorWall: number | null;
  /** Where recAnchorMs came from, which sets how much to trust it. */
  source: 'start' | 'first-data' | 'none' | 'joined';
  /** 'unaligned' is joining mid-match or a recording with no start to key on;
   *  'manual' is the user having moved the playhead off the live run. */
  status: 'aligned' | 'waiting' | 'unaligned' | 'manual' | 'outrun';
};

/** A recording drawn on the Field alongside the open one in compare mode. */
export type GhostOverlay = {
  id: string;
  name: string;
  colour: string;
};

export type RecorderState = {
  enabled: boolean;
  active: boolean;
  frames: number;
  bytes: number;
  /** Not the encoder's durationMs: a max over three tracks, it jumps around. */
  elapsedMs: number;
  durationMs: number;
  id: string | null;
  savedCount: number;
  /** Another tab holds the recorder lease, so it records the op modes. */
  elsewhere: boolean;
};

export type PlaybackState = {
  mode: PlaybackMode;
  isPlaying: boolean;
  /** Bumped when the engine invalidates the telemetry sink. Scoped to it: ghost
   *  drives only the overlay, so advancing there would wipe a live capture. */
  foldToken: number;
  /** A clear inside the RECORDING, not the engine discarding what is on screen.
   *  Only the telemetry fold reads it. Logging and the Graph use foldToken. */
  clearToken: number;
  recordingId: string | null;
  meta: RecordingMeta | null;
  /** Library order. Compare mode draws these as well as the open one. */
  selectedIds: string[];
  /** Every saved recording is selected whenever the library is read. */
  autoSelect: boolean;
  /** Bumped when the library is found to differ from what was last listed. */
  libraryVersion: number;
  /** Opens the selection in compare mode whenever an op mode starts. */
  compareOnStart: boolean;
  overlays: GhostOverlay[];
  cursorMs: number;
  /** In compare mode, long enough for every recording drawn to finish. */
  durationMs: number;
  speed: number;
  loop: boolean;
  ghostOpacity: number;
  markers: Marker[];
  statusTimeline: StatusSample[];
  /** Encoded bytes per time bucket, for the transport bar's sparkline. */
  density: number[];
  recorder: RecorderState;
  align: AlignState;
  error: string | null;
};

export type PlaybackLoadAction = {
  type: typeof PLAYBACK_LOAD;
  id: string;
  mode?: 'ghost';
};

export type PlaybackLoadedAction = {
  type: typeof PLAYBACK_LOADED;
  mode?: 'ghost';
  meta: RecordingMeta;
  durationMs: number;
  markers: Marker[];
  statusTimeline: StatusSample[];
  density: number[];
};

export type PlaybackPlayAction = {
  type: typeof PLAYBACK_PLAY;
  /** Compare mode already started the timer on the live run's clock. */
  following?: boolean;
};
export type PlaybackPauseAction = { type: typeof PLAYBACK_PAUSE };
export type PlaybackSeekAction = { type: typeof PLAYBACK_SEEK; t: number };
export type PlaybackTickAction = {
  type: typeof PLAYBACK_TICK;
  cursorMs: number;
};
export type PlaybackSetSpeedAction = {
  type: typeof PLAYBACK_SET_SPEED;
  speed: number;
};
export type PlaybackSetModeAction = {
  type: typeof PLAYBACK_SET_MODE;
  mode: PlaybackMode;
};
export type PlaybackSetOpacityAction = {
  type: typeof PLAYBACK_SET_OPACITY;
  opacity: number;
};
export type PlaybackSetLoopAction = {
  type: typeof PLAYBACK_SET_LOOP;
  loop: boolean;
};
export type PlaybackExitAction = { type: typeof PLAYBACK_EXIT };
export type PlaybackSetAlignAction = {
  type: typeof PLAYBACK_SET_ALIGN;
  align: Partial<AlignState>;
};
export type PlaybackErrorAction = {
  type: typeof PLAYBACK_ERROR;
  message: string | null;
};
export type PlaybackResetFoldAction = { type: typeof PLAYBACK_RESET_FOLD };
export type PlaybackRecordedClearAction = {
  type: typeof PLAYBACK_RECORDED_CLEAR;
};
export type PlaybackSelectAction = {
  type: typeof PLAYBACK_SELECT;
  ids: string[];
};
export type PlaybackLibraryListedAction = {
  type: typeof PLAYBACK_LIBRARY_LISTED;
  ids: string[];
  joined: string[];
  names: Record<string, string>;
};
export type PlaybackLibraryChangedAction = {
  type: typeof PLAYBACK_LIBRARY_CHANGED;
};
export type PlaybackCompareSelectedAction = {
  type: typeof PLAYBACK_COMPARE_SELECTED;
};
export type PlaybackOverlaysAction = {
  type: typeof PLAYBACK_OVERLAYS;
  overlays: GhostOverlay[];
  durationMs: number;
  density: number[];
};
export type PlaybackRenamedAction = {
  type: typeof PLAYBACK_RENAMED;
  id: string;
  name: string;
};
export type PlaybackSetAutoSelectAction = {
  type: typeof PLAYBACK_SET_AUTO_SELECT;
  enabled: boolean;
};
export type PlaybackSetCompareOnStartAction = {
  type: typeof PLAYBACK_SET_COMPARE_ON_START;
  enabled: boolean;
};
export type RecorderStateAction = {
  type: typeof RECORDER_STATE;
  recorder: Partial<RecorderState>;
};
export type RecorderSetEnabledAction = {
  type: typeof RECORDER_SET_ENABLED;
  enabled: boolean;
};
export type RecorderStartAction = { type: typeof RECORDER_START };
export type RecorderStopAction = { type: typeof RECORDER_STOP };

export type PlaybackAction =
  | PlaybackLoadAction
  | PlaybackLoadedAction
  | PlaybackPlayAction
  | PlaybackPauseAction
  | PlaybackSeekAction
  | PlaybackTickAction
  | PlaybackSetSpeedAction
  | PlaybackSetModeAction
  | PlaybackSetOpacityAction
  | PlaybackSetLoopAction
  | PlaybackExitAction
  | PlaybackSetAlignAction
  | PlaybackErrorAction
  | PlaybackResetFoldAction
  | PlaybackRecordedClearAction
  | PlaybackSelectAction
  | PlaybackLibraryListedAction
  | PlaybackLibraryChangedAction
  | PlaybackCompareSelectedAction
  | PlaybackOverlaysAction
  | PlaybackRenamedAction
  | PlaybackSetAutoSelectAction
  | PlaybackSetCompareOnStartAction
  | RecorderStateAction
  | RecorderSetEnabledAction
  | RecorderStartAction
  | RecorderStopAction;
