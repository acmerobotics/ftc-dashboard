import { AnyAction, Dispatch, Middleware, MiddlewareAPI } from 'redux';

import OpModeStatus from '@/enums/OpModeStatus';
import {
  exitPlayback,
  followLiveRun,
  libraryChanged,
  libraryListed,
  loadRecording,
  overlaysChanged,
  pausePlayback,
  recordingLoaded,
  recordingRenamed,
  recordedClear,
  resetTelemetryFold,
  seekPlayback,
  selectRecordings,
  setAlign,
  setPlaybackMode,
  setPlaybackSpeed,
  setPlaybackError,
  tickPlayback,
} from '@/store/actions/playback';
import { setReplayOverlay } from '@/store/actions/replay';
import {
  DecodedRecording,
  foldRange,
  FoldedState,
  foldTo,
  isClearFrame,
  ReplaySegment,
  seedPacket,
} from '@/store/recording/format';
import {
  GHOST_COLOURS,
  GHOST_RESET,
  overlayIds,
  tint,
} from '@/store/recording/ghosts';
import type { DrawOp } from '@/store/types/telemetry';
import {
  describeStorageError,
  GONE,
  holdOpen,
  list,
  load,
  releaseOpen,
} from '@/store/recording/recordingStore';
import {
  AUTO_SELECT_KEY,
  COMPARE_ON_START_KEY,
} from '@/store/reducers/playback';
import { RootState } from '@/store/reducers';
import {
  RECEIVE_CONNECTION_STATUS,
  RECEIVE_ROBOT_STATUS,
  RECEIVE_TELEMETRY,
  STOP_OP_MODE_TAG,
} from '@/store/types';
import {
  PLAYBACK_COMPARE_SELECTED,
  PLAYBACK_EXIT,
  PLAYBACK_LIBRARY_CHANGED,
  PLAYBACK_LIBRARY_LISTED,
  PLAYBACK_LOAD,
  PLAYBACK_PAUSE,
  PLAYBACK_PLAY,
  PLAYBACK_RENAMED,
  PLAYBACK_SEEK,
  PLAYBACK_SELECT,
  PLAYBACK_SET_AUTO_SELECT,
  PLAYBACK_SET_COMPARE_ON_START,
  PLAYBACK_SET_MODE,
  PLAYBACK_SET_OPACITY,
  PLAYBACK_SET_SPEED,
  RECORDER_STATE,
} from '@/store/types/playback';
import type {
  AlignState,
  PlaybackLibraryListedAction,
  PlaybackLoadAction,
  PlaybackPlayAction,
  PlaybackRenamedAction,
} from '@/store/types/playback';
import type {
  ReceiveTelemetryAction,
  Telemetry,
  TelemetryItem,
} from '@/store/types/telemetry';
import type { ReceiveRobotStatusAction } from '@/store/types/status';

const TICK_MS = 25;
const CURSOR_DISPATCH_MS = 100;

/** History re-sent after a seek, so the graph has a window to draw. */
const PREFILL_MS = 8000;

type Store = MiddlewareAPI<Dispatch<AnyAction>, RootState>;

// Module scope rather than store state: frames are large and churn at 50 Hz.
let rec: DecodedRecording | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let burst: ReturnType<typeof setTimeout> | null = null;
let fold: FoldedState | null = null;
let nextFrameIdx = 0;
let wallStart = 0;
let lastCursorDispatch = 0;
/** The true cursor; the store's is throttled, up to 400 ms behind at 4x. */
let liveCursorMs = 0;
/** Invalidates in-flight loads, so a slow decode cannot revive a closed one. */
let loadSeq = 0;
/** Null until the first status: a run going at page load is no start. */
let robotWasRunning: boolean | null = null;
/** Date.now() at the live START, not INIT, which is off by the init dwell. */
let liveAnchorWall: number | null = null;
let liveWasRunning = false;
/** The op mode that was RUNNING at the last status, or null. */
let liveOpMode: string | null = null;
/** A first status of RUNNING is no edge; the run began at an unknown time. */
let sawAnyStatus = false;
let joinedMidRun = false;
let lastLivePayloadWall = 0;
/** A burst after a gap is START: silence through init, then telemetry. */
let liveBurstStartWall: number | null = null;
let liveStatusWall: number | null = null;
let liveSnapWall: number | null = null;
let ghostEnded = false;
/** Raw ops: the stored overlay has opacity baked in, so rescaling compounds. */
let lastGhostOps: DrawOp[] | null = null;
let reviewing: string | null = null;

type Overlay = {
  id: string;
  rec: DecodedRecording;
  colour: string;
  anchor: { recAnchorMs: number; recSnapMs: number | null };
  /** Dict index of the ops shown, so an idle tick dispatches nothing. */
  shown: number;
};
let overlays: Overlay[] = [];
const overlayLoads = new Set<string>();
/** Recordings that began after their run did, which compare cannot line up. */
const joinedIds = new Set<string>();
let leadOver = false;
/** Each frame's encoded size. Compare mode re-buckets these whenever the
 *  timeline grows, and stringifying a long recording again would stall. */
const frameBytes = new WeakMap<DecodedRecording, number[]>();

function review(id: string | null) {
  if (reviewing === id) return;
  if (reviewing !== null) releaseOpen(reviewing, 'review');
  reviewing = id;
  if (id !== null) holdOpen(id, 'review');
}

/** The tag guard matters: idle is '$Stop$Robot$' in INIT or RUNNING. */
function isOpModeActive(status: {
  activeOpMode?: string;
  activeOpModeStatus?: string;
}): boolean {
  if (!status) return false;
  if (status.activeOpMode === STOP_OP_MODE_TAG) return false;
  if (!status.activeOpMode) return false;
  return (
    status.activeOpModeStatus === OpModeStatus.INIT ||
    status.activeOpModeStatus === OpModeStatus.RUNNING
  );
}

/** A burst this near the RUNNING edge is START; longer silence splits them. */
const SNAP_WINDOW_MS = 1500;

function firstPayloadTime(recording: DecodedRecording): number | null {
  for (const f of recording.frames) {
    if (isClearFrame(f)) continue;
    if (f[1] || f[3] !== null || f[4] !== null) return f[0];
  }
  return null;
}

function recordedAnchor(recording: DecodedRecording): {
  recAnchorMs: number | null;
  recSnapMs: number | null;
  source: AlignState['source'];
} {
  if (recording.meta.joined) {
    return { recAnchorMs: null, recSnapMs: null, source: 'joined' };
  }

  for (const [t, status] of recording.status) {
    if (status.activeOpModeStatus !== OpModeStatus.RUNNING) continue;
    if (!status.activeOpMode || status.activeOpMode === STOP_OP_MODE_TAG) {
      continue;
    }

    // Only when the first data lands just before the status edge, or an op mode
    // telemetering from init_loop snaps to the init dwell.
    const firstData = firstPayloadTime(recording);
    const snap =
      firstData !== null && firstData <= t && t - firstData <= SNAP_WINDOW_MS
        ? firstData
        : null;

    return { recAnchorMs: t, recSnapMs: snap, source: 'start' };
  }

  // No RUNNING sample: the first frame with anything is at worst one poll out.
  for (const f of recording.frames) {
    if (isClearFrame(f)) continue;
    if (f[1] || f[3] !== null || f[4] !== null) {
      return { recAnchorMs: f[0], recSnapMs: null, source: 'first-data' };
    }
  }

  return { recAnchorMs: 0, recSnapMs: null, source: 'none' };
}

/** What compare mode shows while no live run is being followed. */
function restingAlign(recAnchorMs: number | null): AlignState['status'] {
  return recAnchorMs === null || joinedMidRun ? 'unaligned' : 'waiting';
}

/** Ties the playhead to the live run: recorded anchor + (now - live anchor). */
function alignToLiveRun(store: Store) {
  const { align, durationMs, speed } = store.getState().playback;
  if (align.recAnchorMs === null || liveAnchorWall === null) return;

  // Both snap or neither: a shared bias cancels, a one-sided snap exposes it.
  const bothSnap = align.recSnapMs !== null && liveSnapWall !== null;
  const recAnchor = bothSnap ? (align.recSnapMs as number) : align.recAnchorMs;
  const liveAnchor = bothSnap
    ? (liveSnapWall as number)
    : liveStatusWall ?? liveAnchorWall;

  // Any speed but 1x draws the recorded trace 1/speed as wide as its live twin.
  if (speed !== 1) store.dispatch(setPlaybackSpeed(1));

  const elapsed = Date.now() - liveAnchor;
  const cursor = Math.max(0, Math.min(recAnchor + elapsed, durationMs));

  ghostEnded = false;
  store.dispatch(setAlign({ liveAnchorWall: liveAnchor, status: 'aligned' }));
  seekTo(store, cursor);
  startTimer(store, cursor);
  if (!store.getState().playback.isPlaying) store.dispatch(followLiveRun());
}

/** Added to the playhead for the overlay's own time. Each is lined up on its
 *  own start, with the same choice of snap the live alignment makes, or at
 *  zero under an open recording that has no start. */
function overlayOffset(o: Overlay, align: AlignState): number {
  if (align.recAnchorMs === null) return o.anchor.recAnchorMs;
  if (align.recSnapMs !== null && o.anchor.recSnapMs !== null) {
    return o.anchor.recSnapMs - align.recSnapMs;
  }
  return o.anchor.recAnchorMs - align.recAnchorMs;
}

/** Graph.add plots on wall time, and this is the wall time t plays at. */
function virtualTs(t: number, speed: number): number {
  return wallStart + t / speed;
}

function emit(store: Store, telemetry: Telemetry) {
  const action: ReceiveTelemetryAction = {
    type: RECEIVE_TELEMETRY,
    telemetry,
    __replay: true,
  };
  store.dispatch(action);
}

function computeDensity(
  recording: DecodedRecording,
  span = recording.meta.durationMs,
  buckets = 60,
): number[] {
  const out = new Array(buckets).fill(0);
  if (span <= 0) return out;

  const bytes =
    frameBytes.get(recording) ??
    recording.frames.map((f) => JSON.stringify(f).length);
  frameBytes.set(recording, bytes);
  recording.frames.forEach((f, i) => {
    const bucket = Math.min(buckets - 1, Math.floor((f[0] / span) * buckets));
    out[bucket] += bytes[i];
  });

  return out;
}

/** Every alpha, not just a leading op: Field.js applies alpha absolutely. */
function withGhostOpacity(ops: DrawOp[], opacity: number): DrawOp[] {
  return [
    { type: 'alpha', alpha: opacity } as DrawOp,
    ...ops.map((op) =>
      op.type === 'alpha' ? { ...op, alpha: op.alpha * opacity } : op,
    ),
  ];
}

/** Moves each overlay to lead time `t`; true if any drawing changed. */
function positionOverlays(store: Store, t: number): boolean {
  const { align } = store.getState().playback;
  let moved = false;
  for (const o of overlays) {
    const shown = foldTo(o.rec, t + overlayOffset(o, align)).lo;
    if (shown !== o.shown) moved = true;
    o.shown = shown;
  }
  return moved;
}

/** One colour per recording once there are several: runs of one op mode draw in
 *  the same colours, so without it they cannot be told apart. */
function composeGhosts(store: Store): DrawOp[] {
  const { ghostOpacity } = store.getState().playback;
  const several = overlays.length > 0;
  const drawn = [
    { ops: lastGhostOps, colour: GHOST_COLOURS[0] },
    ...overlays.map((o) => ({ ops: o.rec.dict[o.shown], colour: o.colour })),
  ];

  const out: DrawOp[] = [];
  for (const { ops, colour } of drawn) {
    if (!ops || ops.length === 0) continue;
    out.push(
      ...withGhostOpacity(several ? tint(ops, colour) : ops, ghostOpacity),
    );
    if (several) out.push(...GHOST_RESET);
  }
  return out;
}

/** `replace`, for a seek: the track shows nothing rather than what it had. */
function dispatchGhost(
  store: Store,
  segments: ReplaySegment[],
  replace = false,
) {
  // Searched apart: a packet often carries ops and not data, or the reverse.
  let ops: DrawOp[] | null = null;
  let data: { [key: string]: string } | null = null;

  outer: for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i];
    if (segment.kind !== 'batch') continue;

    for (let j = segment.packets.length - 1; j >= 0; j--) {
      const packet = segment.packets[j];

      if (ops === null) {
        // fieldOverlay only: a second copy of the seeded `field` ops would
        // cover the live robot and its trail.
        const packetOps = [...(packet.fieldOverlay?.ops ?? [])];
        if (packetOps.length > 0) {
          lastGhostOps = packetOps;
          ops = packetOps;
        }
      }

      if (data === null && Object.keys(packet.data).length > 0) {
        data = packet.data;
      }

      if (ops !== null && data !== null) break outer;
    }
  }

  if (replace && ops === null) lastGhostOps = null;
  const moved = positionOverlays(store, liveCursorMs);
  // Only the open recording reaches the Graph, which flatlines past its end.
  const ended =
    overlays.length > 0 && !!rec && liveCursorMs >= rec.meta.durationMs;
  const quiet = ops === null && data === null && !moved && ended === leadOver;
  if (!replace && quiet) return;
  leadOver = ended;

  // Each track keeps what it was showing, or an uneven recording strobes.
  const current = replace ? { data: {} } : store.getState().replay;
  store.dispatch(
    setReplayOverlay(composeGhosts(store), ended ? {} : data ?? current.data),
  );
}

function dispatchSegments(store: Store, segments: ReplaySegment[]) {
  const { mode } = store.getState().playback;
  if (mode === 'ghost') dispatchGhost(store, segments);
  if (mode !== 'playback') return;

  segments.forEach((segment, i) => {
    if (segment.kind === 'clear') {
      if (segments[i - 1]?.kind === 'clear') return;
      // An empty batch, as the robot sent it, so the Field keeps its drawing.
      store.dispatch(recordedClear());
      emit(store, []);
    } else {
      // Fresh array: TelemetryView keys on identity; a reused one looks frozen.
      emit(store, [...segment.packets]);
    }
  });
}

function stopTimer() {
  if (timer !== null) clearInterval(timer);
  timer = null;
  if (burst !== null) clearTimeout(burst);
  burst = null;
}

/** End of the run of clears, or of packets, at `from`. React renders once per
 *  task, so a clear sharing one with the packets before it hides them. */
function unitEnd(recording: DecodedRecording, from: number, to: number) {
  const clear = isClearFrame(recording.frames[from]);
  let end = from;
  while (end < to && isClearFrame(recording.frames[end + 1]) === clear) {
    end += 1;
  }
  return end;
}

function teardown() {
  stopTimer();
  rec = null;
  fold = null;
  nextFrameIdx = 0;
  lastGhostOps = null;
  for (const o of overlays) releaseOpen(o.id, 'compare');
  overlays = [];
}

function seekTo(store: Store, tMs: number) {
  const { speed, mode, durationMs } = store.getState().playback;
  // Live keeps the recording open, but nothing of it may reach the sink.
  if (!rec || mode === 'live') return;

  const target = Math.max(0, Math.min(tMs, durationMs));
  wallStart = Date.now() - target / speed;
  liveCursorMs = target;

  // Reset per recording, or a second lap skips the stop and the timer runs on.
  ghostEnded = false;

  const windowStart = Math.max(0, target - PREFILL_MS);
  const base = foldTo(rec, windowStart);
  const targetIdx = foldTo(rec, target).frameIdx;
  const segments = foldRange(rec, base, base.frameIdx + 1, targetIdx, (t) =>
    virtualTs(t, speed),
  );

  // One batch: per frame, a 20 Hz scrub would re-run every fold ~1600 times a
  // second. Clears inside the window only matter to what the seed carries.
  const packets: TelemetryItem[] = [];
  for (const segment of segments) {
    if (segment.kind === 'batch') packets.push(...segment.packets);
  }
  packets.push(seedPacket(rec, base, virtualTs(target, speed), target));

  if (mode === 'ghost') {
    dispatchGhost(store, [{ kind: 'batch', packets }], true);
  } else {
    // One task with the batch, so no view shows what preceded the seek.
    store.dispatch(resetTelemetryFold());
    emit(store, packets);
  }

  fold = base;
  nextFrameIdx = targetIdx + 1;
  lastCursorDispatch = 0;
}

function tickInner(store: Store) {
  if (!rec || !fold) return;

  const { speed, loop, durationMs, mode } = store.getState().playback;
  const cursor = (Date.now() - wallStart) * speed;
  liveCursorMs = cursor;

  let lastIdx = nextFrameIdx - 1;
  while (
    lastIdx + 1 < rec.frames.length &&
    rec.frames[lastIdx + 1][0] <= cursor
  ) {
    lastIdx += 1;
  }

  if (lastIdx >= nextFrameIdx) {
    const end =
      mode === 'ghost' ? lastIdx : unitEnd(rec, nextFrameIdx, lastIdx);
    const segments = foldRange(rec, fold, nextFrameIdx, end, (t) =>
      virtualTs(t, speed),
    );
    nextFrameIdx = end + 1;
    dispatchSegments(store, segments);
    if (end < lastIdx && burst === null) {
      burst = setTimeout(() => {
        burst = null;
        tick(store);
      }, 0);
    }
  } else if (mode === 'ghost') {
    // Overlays move on their own frames; this emits no telemetry either, as an
    // idle tick must not: receiveTelemetry([]) would clear.
    dispatchGhost(store, []);
  }

  const now = Date.now();
  if (now - lastCursorDispatch >= CURSOR_DISPATCH_MS) {
    lastCursorDispatch = now;
    store.dispatch(tickPlayback(Math.min(cursor, durationMs)));
  }

  if (cursor >= durationMs && nextFrameIdx >= rec.frames.length) {
    const ghost = store.getState().playback.mode === 'ghost';

    if (ghost) {
      // Cleared once, not per tick, which would strobe the field.
      if (!ghostEnded) {
        ghostEnded = true;
        // Field ops stay, telemetry goes: a flatlined graph would read as live.
        positionOverlays(store, durationMs);
        store.dispatch(setReplayOverlay(composeGhosts(store), {}));
        stopTimer();
        store.dispatch(tickPlayback(durationMs));
        store.dispatch(pausePlayback());
      }
      return;
    }

    if (loop) {
      // Dispatched, not called: the store cursor rewinds now, not a tick later.
      store.dispatch(seekPlayback(0));
    } else {
      stopTimer();
      store.dispatch(tickPlayback(durationMs));
      store.dispatch(pausePlayback());
    }
  }
}

function tick(store: Store) {
  try {
    tickInner(store);
  } catch (err) {
    // Or a malformed recording would rethrow forty times a second forever.
    stopTimer();
    store.dispatch(
      setPlaybackError(
        `Playback stopped: ${err instanceof Error ? err.message : String(err)}`,
      ),
    );
    store.dispatch(pausePlayback());
  }
}

function startTimer(store: Store, fromMs?: number) {
  stopTimer();
  const { cursorMs, speed } = store.getState().playback;
  const from = fromMs ?? cursorMs;
  wallStart = Date.now() - from / speed;
  liveCursorMs = from;
  timer = setInterval(() => tick(store), TICK_MS);
}

/** Not seekPlayback, which compare mode takes as a scrub and pauses. */
function playFromStart(store: Store) {
  store.dispatch(tickPlayback(0));
  seekTo(store, 0);
  startTimer(store, 0);
}

function resetSinks(store: Store, fromMode: 'ghost' | 'playback') {
  store.dispatch(setReplayOverlay([]));
  if (fromMode !== 'playback') return;

  store.dispatch(resetTelemetryFold());
  emit(store, []);
}

/** Reports the overlays and the timeline they need; `republish` also redraws
 *  them where the playhead is. */
function refreshOverlays(store: Store, republish: boolean) {
  if (!rec) return;
  const { align } = store.getState().playback;
  let end = rec.meta.durationMs;
  for (const o of overlays) {
    end = Math.max(end, o.rec.meta.durationMs - overlayOffset(o, align));
  }

  const info = overlays.map((o) => ({
    id: o.id,
    name: o.rec.meta.name,
    colour: o.colour,
  }));
  store.dispatch(overlaysChanged(info, end, computeDensity(rec, end)));

  if (republish && store.getState().playback.mode === 'ghost') {
    positionOverlays(store, liveCursorMs);
    store.dispatch(
      setReplayOverlay(composeGhosts(store), store.getState().replay.data),
    );
  }
}

function addOverlay(
  store: Store,
  id: string,
  loaded: DecodedRecording | null,
  failure?: unknown,
) {
  overlayLoads.delete(id);
  const { selectedIds } = store.getState().playback;
  const wanted = overlayIds(store.getState().playback, joinedIds);
  if (!loaded || !rec || !wanted.includes(id)) {
    releaseOpen(id, 'compare');
    if (!loaded && wanted.includes(id)) {
      store.dispatch(selectRecordings(selectedIds.filter((s) => s !== id)));
      const why =
        failure === undefined ? `${GONE}.` : describeStorageError(failure);
      store.dispatch(
        setPlaybackError(`Could not compare a selected recording: ${why}`),
      );
      if (failure === undefined) forgetGone(store);
    }
    return;
  }

  const { recAnchorMs, recSnapMs } = recordedAnchor(loaded);
  if (recAnchorMs === null) {
    joinedIds.add(id);
    releaseOpen(id, 'compare');
    syncOverlays(store);
    return;
  }

  const used = new Set(overlays.map((o) => o.colour));
  const colour =
    GHOST_COLOURS.slice(1).find((c) => !used.has(c)) ?? GHOST_COLOURS[1];
  const anchor = { recAnchorMs, recSnapMs };
  overlays.push({ id, rec: loaded, colour, anchor, shown: -1 });
  overlays.sort((a, b) => wanted.indexOf(a.id) - wanted.indexOf(b.id));

  const shorter = store.getState().playback.durationMs;
  refreshOverlays(store, true);
  const { mode, isPlaying, align, durationMs } = store.getState().playback;
  // A timeline too short for the live run ended the ghost; this may cover it.
  if (
    durationMs > shorter &&
    mode === 'ghost' &&
    (isPlaying || ghostEnded) &&
    liveAnchorWall !== null &&
    align.recAnchorMs !== null
  ) {
    alignToLiveRun(store);
  }
}

/** Loads what compare mode draws besides the open recording, and lets go of
 *  the rest. `force` reports the timeline even when no overlay went. */
function syncOverlays(store: Store, force = false) {
  const wanted = overlayIds(store.getState().playback, joinedIds);
  const kept = overlays.filter((o) => wanted.includes(o.id));
  for (const o of overlays) {
    if (!kept.includes(o)) releaseOpen(o.id, 'compare');
  }
  const dropped = kept.length !== overlays.length;
  overlays = kept;

  for (const id of wanted) {
    if (overlayLoads.has(id)) continue;
    if (overlays.some((o) => o.id === id)) continue;
    overlayLoads.add(id);
    holdOpen(id, 'compare');
    void load(id).then(
      (loaded) => addOverlay(store, id, loaded),
      (err) => addOverlay(store, id, null, err ?? new Error('unknown error')),
    );
  }

  if (dropped || force) refreshOverlays(store, dropped);
}

/** Re-reads the library, so auto-select holds without the Recorder open. */
function relist(store: Store): Promise<void> {
  return list()
    .then((entries) => {
      store.dispatch(libraryListed(entries.map((e) => e.meta)));
    })
    .catch(() => undefined);
}

/** Deleted in another tab, or site data cleared: the list must say so. */
function forgetGone(store: Store) {
  store.dispatch(libraryChanged());
}

/** Opens the selection to compare, led by the open recording if selected. */
function compareSelection(store: Store) {
  const { selectedIds, recordingId, mode, recorder } =
    store.getState().playback;
  const recording = recorder.active ? recorder.id : null;
  const candidates = selectedIds.filter((id) => id !== recording);
  if (candidates.length === 0) return;

  if (recordingId !== null && candidates.includes(recordingId)) {
    store.dispatch(setPlaybackMode('ghost'));
    return;
  }
  if (mode !== 'live') store.dispatch(exitPlayback());
  const lead = candidates.find((id) => !joinedIds.has(id)) ?? candidates[0];
  store.dispatch(loadRecording(lead, 'ghost'));
}

/** Gating `telemetry` replays every view reading it; `status` stays live. */
const playbackMiddleware: Middleware<Record<string, unknown>, RootState> =
  (store) => (next) => (action) => {
    const api = store as unknown as Store;
    const before = store.getState().playback;

    switch (action.type) {
      case PLAYBACK_LOAD: {
        const { id, mode: asked } = action as PlaybackLoadAction;
        const result = next(action);

        const seq = ++loadSeq;
        review(id);

        void load(id)
          .then((loaded) => {
            if (seq !== loadSeq) return;

            if (!loaded) {
              review(rec?.meta.id ?? null);
              store.dispatch(
                setPlaybackError(`Could not open that recording: ${GONE}.`),
              );
              forgetGone(api);
              return;
            }

            stopTimer();
            rec = loaded;
            fold = null;
            nextFrameIdx = 0;
            store.dispatch(
              recordingLoaded(
                loaded.meta,
                loaded.meta.durationMs,
                loaded.markers,
                loaded.status,
                computeDensity(loaded),
                asked,
              ),
            );

            const { recAnchorMs, recSnapMs, source } = recordedAnchor(loaded);
            const canAlign =
              store.getState().playback.mode === 'ghost' &&
              liveAnchorWall !== null &&
              recAnchorMs !== null;

            store.dispatch(
              setAlign({
                recAnchorMs,
                recSnapMs,
                source,
                liveAnchorWall,
                // Gated, or a mid-match swap says 'aligned' over a stuck ghost.
                status: canAlign
                  ? 'aligned'
                  : liveAnchorWall === null
                  ? restingAlign(recAnchorMs)
                  : 'unaligned',
              }),
            );
            syncOverlays(api, true);

            if (canAlign) {
              alignToLiveRun(api);
            } else {
              seekTo(api, 0);
            }
          })
          .catch((err) => {
            if (seq !== loadSeq) return;
            review(rec?.meta.id ?? null);
            store.dispatch(
              setPlaybackError(
                `Could not open that recording: ${describeStorageError(err)}`,
              ),
            );
          });

        return result;
      }

      case PLAYBACK_PLAY: {
        if ((action as PlaybackPlayAction).following) return next(action);
        const result = next(action);
        const { mode, cursorMs, durationMs, align } = store.getState().playback;

        // The playhead is the live run's here: Play means "line up again".
        if (
          mode === 'ghost' &&
          rec &&
          liveAnchorWall !== null &&
          align.recAnchorMs !== null
        ) {
          alignToLiveRun(api);
          // A live run past the recording's end leaves nothing to follow.
          if (liveCursorMs < durationMs) return result;
          store.dispatch(setAlign({ status: 'outrun' }));
          playFromStart(api);
          return result;
        }

        if (mode !== 'live' && rec) {
          if (durationMs > 0 && cursorMs >= durationMs) {
            playFromStart(api);
          } else {
            startTimer(api);
          }
        }
        return result;
      }

      case PLAYBACK_PAUSE: {
        const wasRunning = timer !== null;
        stopTimer();
        const result = next(action);
        // The store cursor is throttled; steps and resume start from it.
        if (wasRunning && rec) {
          const { durationMs } = store.getState().playback;
          store.dispatch(tickPlayback(Math.min(liveCursorMs, durationMs)));
        }
        return result;
      }

      case PLAYBACK_SEEK: {
        const result = next(action);
        const { cursorMs, isPlaying, mode } = store.getState().playback;
        seekTo(api, cursorMs);
        // Moved by hand in compare mode, the ghost no longer follows the robot.
        if (mode === 'ghost' && isPlaying) store.dispatch(pausePlayback());
        else if (isPlaying) startTimer(api);
        return result;
      }

      case PLAYBACK_SET_SPEED: {
        const atChange = liveCursorMs;
        const result = next(action);
        // Re-anchor from the true cursor, not the throttled one in the store.
        if (store.getState().playback.isPlaying) startTimer(api, atChange);
        return result;
      }

      case PLAYBACK_SET_MODE: {
        const requested = (action as { mode: string }).mode;
        // Unchanged: the reducer skips it, and the branch below would rewind.
        if (requested === before.mode) return next(action);

        const result = next(action);
        const mode = store.getState().playback.mode;

        // Handed back first, even on the playback-to-ghost edge, which would
        // otherwise leave a recorded frame, opaque, posing as the live robot.
        if (before.mode === 'ghost' || before.mode === 'playback') {
          resetSinks(api, before.mode);
        }

        // Before the mode test: switching while playing leaves an orphaned
        // tick otherwise, and startTimer is gated on isPlaying, now false.
        stopTimer();
        syncOverlays(api, true);

        if (mode === 'live') {
          // Not teardown(): the reducer keeps recordingId, so discarding the
          // decode leaves the store advertising a recording the engine lost.
        } else if (mode === 'ghost' && rec) {
          // Compare's claim only holds if both clocks start at the same event.
          const { recAnchorMs } = store.getState().playback.align;
          if (liveAnchorWall !== null && recAnchorMs !== null) {
            alignToLiveRun(api);
          } else {
            store.dispatch(setAlign({ status: restingAlign(recAnchorMs) }));
            store.dispatch(seekPlayback(0));
          }
        } else if (rec) {
          store.dispatch(seekPlayback(0));
        }

        return result;
      }

      case PLAYBACK_EXIT: {
        const wasMode = before.mode;
        loadSeq += 1;
        teardown();
        review(null);
        const result = next(action);

        if (wasMode === 'ghost' || wasMode === 'playback') {
          resetSinks(api, wasMode);
        }

        return result;
      }

      case PLAYBACK_SET_OPACITY: {
        const result = next(action);

        // Re-applied now: opacity rides on frames, and none come while paused.
        if (
          store.getState().playback.mode === 'ghost' &&
          (lastGhostOps !== null || overlays.length > 0)
        ) {
          store.dispatch(
            setReplayOverlay(
              composeGhosts(store),
              store.getState().replay.data,
            ),
          );
        }

        return result;
      }

      case PLAYBACK_SELECT:
      case PLAYBACK_LIBRARY_LISTED: {
        const result = next(action);
        if (action.type === PLAYBACK_LIBRARY_LISTED) {
          const { joined, names } = action as PlaybackLibraryListedAction;
          for (const id of joined) joinedIds.add(id);
          // Renamed in another tab: what is open here goes by the new name.
          for (const r of [rec, ...overlays.map((o) => o.rec)]) {
            const name = r ? names[r.meta.id] : undefined;
            if (r && name !== undefined && name !== r.meta.name) {
              store.dispatch(recordingRenamed(r.meta.id, name));
            }
          }
        }
        syncOverlays(api);
        return result;
      }

      case PLAYBACK_LIBRARY_CHANGED: {
        const result = next(action);
        void relist(api);
        return result;
      }

      case PLAYBACK_RENAMED: {
        const { id, name } = action as PlaybackRenamedAction;
        for (const r of [rec, ...overlays.map((o) => o.rec)]) {
          if (r?.meta.id === id) r.meta = { ...r.meta, name };
        }
        return next(action);
      }

      case PLAYBACK_COMPARE_SELECTED: {
        const result = next(action);
        compareSelection(api);
        return result;
      }

      case RECORDER_STATE: {
        const result = next(action);
        // The run being recorded is never drawn over itself, until it is saved.
        const { id, active, savedCount } = store.getState().playback.recorder;
        if (id !== before.recorder.id || active !== before.recorder.active) {
          syncOverlays(api);
        }
        if (
          savedCount !== before.recorder.savedCount &&
          store.getState().playback.autoSelect
        ) {
          void relist(api);
        }
        return result;
      }

      case PLAYBACK_SET_AUTO_SELECT:
      case PLAYBACK_SET_COMPARE_ON_START: {
        const result = next(action);
        const { autoSelect, compareOnStart } = store.getState().playback;
        try {
          window.localStorage.setItem(AUTO_SELECT_KEY, String(autoSelect));
          window.localStorage.setItem(
            COMPARE_ON_START_KEY,
            String(compareOnStart),
          );
        } catch {
          // Full or disabled storage just makes the preference per-session.
        }
        if (action.type === PLAYBACK_SET_AUTO_SELECT && autoSelect) {
          void relist(api);
        }
        return result;
      }

      case RECEIVE_TELEMETRY: {
        const telemetryAction = action as ReceiveTelemetryAction;
        if (telemetryAction.__replay) return next(action);

        // The robot sends nothing in init, so the first burst after a silence
        // is START to within a frame, sharper than the 1 Hz poll.
        const carriesPayload = (telemetryAction.telemetry ?? []).some(
          (p) =>
            Object.keys(p.data ?? {}).length > 0 ||
            (p.fieldOverlay?.ops?.length ?? 0) > 0 ||
            (p.field?.ops?.length ?? 0) > 0,
        );
        if (carriesPayload) {
          const now = Date.now();
          if (now - lastLivePayloadWall > SNAP_WINDOW_MS) {
            liveBurstStartWall = now;

            // The status edge and first packet race; refine either way round.
            if (
              liveStatusWall !== null &&
              liveSnapWall === null &&
              Math.abs(now - liveStatusWall) <= SNAP_WINDOW_MS
            ) {
              liveSnapWall = now;
              if (store.getState().playback.mode === 'ghost') {
                alignToLiveRun(api);
              }
            }
          }
          lastLivePayloadWall = now;
        }

        if (before.mode !== 'playback') return next(action);

        // Dropped so the recording stays the only source while it plays.
        return undefined;
      }

      case RECEIVE_CONNECTION_STATUS: {
        // A run started while the link was down is no edge when it returns.
        if (!(action as { isConnected?: boolean }).isConnected) {
          sawAnyStatus = false;
        }
        return next(action);
      }

      case RECEIVE_ROBOT_STATUS: {
        // Never gated or forged: a moving robot always wins over a recording.
        const result = next(action);

        const status = (action as ReceiveRobotStatusAction).status;
        const running = isOpModeActive(status);
        const started = running && robotWasRunning === false;
        robotWasRunning = running;
        const firstStatus = !sawAnyStatus;

        const liveRunning =
          !!status &&
          status.activeOpModeStatus === OpModeStatus.RUNNING &&
          !!status.activeOpMode &&
          status.activeOpMode !== STOP_OP_MODE_TAG;
        const liveName = liveRunning ? status.activeOpMode : null;

        if (liveRunning && liveWasRunning && liveName !== liveOpMode) {
          // Another op mode, with no stop seen in between: it started while the
          // link was down or between a hidden tab's polls, at an unknown time.
          joinedMidRun = true;
          liveAnchorWall = null;
          liveStatusWall = null;
          liveSnapWall = null;
          const { mode, isPlaying } = store.getState().playback;
          if (mode === 'ghost' && isPlaying) store.dispatch(pausePlayback());
          store.dispatch(
            setAlign({ liveAnchorWall: null, status: 'unaligned' }),
          );
        } else if (liveRunning && !liveWasRunning) {
          if (!sawAnyStatus) {
            // Joined mid-run. Refuse rather than invent an origin.
            joinedMidRun = true;
            store.dispatch(setAlign({ status: 'unaligned' }));
          } else {
            joinedMidRun = false;
            const edge = Date.now();
            liveStatusWall = edge;
            // Only if the burst began just before this edge, not during init.
            liveSnapWall =
              liveBurstStartWall !== null &&
              Math.abs(edge - liveBurstStartWall) <= SNAP_WINDOW_MS
                ? liveBurstStartWall
                : null;
            liveAnchorWall = liveSnapWall ?? edge;
            store.dispatch(setAlign({ liveAnchorWall }));
            if (store.getState().playback.mode === 'ghost') alignToLiveRun(api);
          }
        } else if (!liveRunning && liveWasRunning) {
          // A finished run is no origin: the next comparison would reuse it.
          joinedMidRun = false;
          liveAnchorWall = null;
          liveStatusWall = null;
          liveSnapWall = null;
          const { recAnchorMs } = store.getState().playback.align;
          store.dispatch(
            setAlign({
              liveAnchorWall: null,
              status: restingAlign(recAnchorMs),
            }),
          );
        }
        liveWasRunning = liveRunning;
        liveOpMode = liveName;
        sawAnyStatus = true;

        // Edge-triggered: a level test would bar playback while connected.
        if (started && before.mode === 'playback') {
          store.dispatch(exitPlayback());
          store.dispatch(
            setPlaybackError('Left replay: an op mode started on the robot.'),
          );
        }

        // Usually on INIT, so the recordings have loaded by START.
        if (
          started &&
          !firstStatus &&
          store.getState().playback.compareOnStart
        ) {
          void relist(api).then(() => {
            if (store.getState().playback.mode !== 'ghost') {
              compareSelection(api);
            }
          });
        }

        return result;
      }

      default:
        return next(action);
    }
  };

export default playbackMiddleware;
