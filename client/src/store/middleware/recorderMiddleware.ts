import { AnyAction, Dispatch, Middleware, MiddlewareAPI } from 'redux';

import OpModeStatus from '@/enums/OpModeStatus';
import {
  libraryChanged,
  setPlaybackError,
  setRecorderState,
} from '@/store/actions/playback';
import {
  createEncoder,
  Encoder,
  RECORDING_CAP,
  RecordingChunk,
  RecordingMeta,
} from '@/store/recording/format';
import {
  AppendResult,
  appendChunk,
  claimRecorder,
  describeStorageError,
  evictAuto,
  evictForSpace,
  holdOpen,
  holderSavedTo,
  holdsRecorder,
  isIndexedDbAvailable,
  isQuotaExceeded,
  newRecordingId,
  noteLibraryChanged,
  RECORDER_LEASE_KEY,
  RECORDER_STALE_MS,
  RecorderLease,
  recorderHeldElsewhere,
  releaseOpen,
  releaseRecorder,
  remove,
  retryStorage,
  storageWarning,
  wasRemovedHere,
} from '@/store/recording/recordingStore';
import { RootState } from '@/store/reducers';
import {
  GET_ROBOT_STATUS,
  RECEIVE_CONNECTION_STATUS,
  RECEIVE_LOGCAT_ERRORS,
  RECEIVE_ROBOT_STATUS,
  RECEIVE_TELEMETRY,
  STOP_OP_MODE_TAG,
} from '@/store/types';
import { RECORDER_ENABLED_KEY } from '@/store/reducers/playback';
import {
  RECORDER_SET_ENABLED,
  RECORDER_START,
  RECORDER_STOP,
} from '@/store/types/playback';
import type {
  ReceiveTelemetryAction,
  TelemetryItem,
} from '@/store/types/telemetry';
import type {
  ReceiveRobotStatusAction,
  RobotStatus,
} from '@/store/types/status';
import type { ReceiveLogcatErrorsAction } from '@/store/types/logcat';

const FLUSH_INTERVAL_MS = 5000;
/** A hidden tab's timers can stall for a minute, but not its socket, so
 *  telemetry flushes a session whose timer is this late. */
const FLUSH_LATE_MS = 1.5 * FLUSH_INTERVAL_MS;
// Fast enough that a tenths-of-a-second readout actually moves.
const STATS_INTERVAL_MS = 250;
const STATUS_SAMPLE_INTERVAL_MS = 1000;
const FINAL_RETRY_MS = 2000;
const MAX_FLUSH_FAILURES = 3;
/** Re-running the same op mode within this window rejoins, not starts over. */
const RESUME_WINDOW_MS = 30000;
/** Sessions start on the 1 Hz status poll, a second after what INIT sends. */
const PREROLL_MS = 2000;
/** Kept while not recording, to cover what a holder that died had not saved. */
const BACKLOG_MS = RECORDER_STALE_MS + FLUSH_LATE_MS + 4000;
const BACKLOG_BATCHES = 2000;
const BACKLOG_MAX_MS = 60000;
/** A hidden tab can poll once a minute; an older status dates no run start. */
const STATUS_FRESH_MS = 2500;
const RESET_QUIET_MS = 1000;
const LEASE_RENEW_MS = 1000;
const ERROR_LEVELS = new Set(['E', 'F', 'A', 'ERROR']);
const MARKED_LEVELS = new Set([...ERROR_LEVELS, 'W', 'WARN']);

type Session = {
  id: string;
  encoder: Encoder;
  wallT0: number;
  opMode: string;
  createdAt: number;
  sawTelemetry: boolean;
  sawField: boolean;
  lastStatusSampleMs: number;
  lastStatusSampled: string | undefined;
  dirty: boolean;
  /** True once a save has succeeded, so a missing meta row means "deleted". */
  everSaved: boolean;
  /** Abandoned, or found deleted: flushes still queued write nothing. */
  closed: boolean;
  failures: number;
  savedBytes: number;
  /** Up to when what it recorded is stored, for a tab taking the run over. */
  savedTo: number;
  manual: boolean;
  saving: Promise<void>;
  /** A run over RECORDING_CAP is saved as numbered parts sharing one name. */
  part: number;
  split: boolean;
  nameStamp: number;
  savedName: string | undefined;
  /** Started by telemetry before any status named the op mode. */
  provisional: boolean;
  sawRunning: boolean;
  startedAtReset: boolean;
  joined: boolean | undefined;
};

// Module scope rather than store state: frames are large and churn at 50 Hz.
let session: Session | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let flushedAt = 0;
let statsTimer: ReturnType<typeof setInterval> | null = null;
/** Kept in case the link returns: ending on disconnect cuts a match in two. */
let suspended: Session | null = null;
let suspendedAt = 0;
/** Retires a suspended session whose link never returns. */
let suspendTimer: ReturnType<typeof setTimeout> | null = null;
let armedOpMode: string | null = null;
/** Stopped by hand. The level trigger would otherwise re-arm next poll. */
let suppressedOpMode: string | null = null;
/** A run taken over from another tab during a clip, which records it and
 *  whose Stop leaves it on. */
let adopted: string | null = null;
let savedCount = 0;
/** Recent batches; `start` marks INIT's empty one, not telemetry.clear()'s. */
let preroll: { wall: number; packets: TelemetryItem[]; start: boolean }[] = [];
/** When data last came, or might have while the link was down. */
let dataSeenAt = 0;
const seenStatus: { wall: number; status: Partial<RobotStatus> }[] = [];
/** While the robot is idle, a batch is a run's late tail, not a start. */
let telemetryStartBlocked = false;
/** The last status on this connection, so a session can see its run begin. */
let lastSeen: { opMode: string | null; status?: string; at: number } | null =
  null;
let storageWasAvailable = true;
let renewTimer: ReturnType<typeof setInterval> | null = null;
let renewedAt = 0;
let leaseWatched = false;
/** From pagehide, after which the page turns hidden and would renew it. */
let leaving = false;
/** Since when this tab has kept every batch: linked, with recording on. */
let bufferedSince: number | null = null;
/** Automatic sessions ended here whose last save has not landed yet. */
const finishing = new Set<Session>();
/** Set as this tab leaves a run it cannot save to another, as if it died. */
let handedOverAt = -Infinity;
let saveFailed = false;
/** A run this tab gave up, kept back to its last save until a tab takes it. */
let gaveUp: { opMode: string; savedTo: number; ended: boolean } | null = null;
/** Wait to take that run back, doubled so a lasting fault shows few errors. */
let retryAfter = 0;

function keeping(ms: number): [number, number] {
  const capped = Math.max(PREROLL_MS, Math.min(BACKLOG_MAX_MS, ms));
  return [capped, Math.ceil((BACKLOG_BATCHES * capped) / BACKLOG_MS)];
}

/** Longer by however far the holder's saves lag, or those of gaveUp. */
function backlog(now: number): [number, number] {
  const savedTo = Math.min(holderSavedTo() ?? now, gaveUp?.savedTo ?? now);
  return keeping(BACKLOG_MS + Math.max(0, now - savedTo - FLUSH_LATE_MS));
}

function remember(packets: TelemetryItem[], wall: number, start: boolean) {
  const last = preroll[preroll.length - 1];
  // One entry for clears in a row, or clearing every loop crowds data out.
  if (packets.length === 0 && last?.packets.length === 0) {
    last.wall = wall;
    if (start) last.start = true;
  } else {
    preroll.push({ wall, packets, start });
  }
  const [keepMs, keepBatches] =
    session && (!session.manual || holdsRecorder())
      ? keeping(wall - session.savedTo + PREROLL_MS)
      : backlog(wall);
  while (preroll.length > keepBatches || wall - preroll[0].wall > keepMs) {
    const gone = preroll.shift();
    // A run's reset holds no data, so the run starts at what follows it.
    if (gone?.start && gone.packets.length === 0) preroll[0].start = true;
  }
}

function rememberStatus(status: RobotStatus) {
  const { activeOpMode, activeOpModeStatus, batteryVoltage } = status;
  const wall = Date.now();
  seenStatus.push({
    wall,
    status: { activeOpMode, activeOpModeStatus, batteryVoltage },
  });
  const [keepMs] = backlog(wall);
  while (wall - seenStatus[0].wall > keepMs) seenStatus.shift();
}

/** The pre-roll from the start of the run at `at`, or its last empty batch. */
function runFrom(at: number) {
  let i = preroll.length - 1;
  let empty = -1;
  while (i >= 0 && !(preroll[i].start && preroll[i].wall <= at)) {
    const b = preroll[i];
    if (empty < 0 && b.wall <= at && b.packets.length === 0) empty = i;
    i -= 1;
  }
  return preroll.slice(Math.max(0, i >= 0 ? i : empty));
}

/** onOpModePreInit sets INIT for DefaultOpMode too, so an idle robot reports
 *  INIT/RUNNING with '$Stop$Robot$'; the tag guard is what keeps this right. */
function activeOpModeName(status: {
  activeOpMode?: string;
  activeOpModeStatus?: string;
}): string | null {
  if (!status) return null;
  if (!status.activeOpMode || status.activeOpMode === STOP_OP_MODE_TAG) {
    return null;
  }
  const running =
    status.activeOpModeStatus === OpModeStatus.INIT ||
    status.activeOpModeStatus === OpModeStatus.RUNNING;
  return running ? status.activeOpMode : null;
}

type Store = MiddlewareAPI<Dispatch<AnyAction>, RootState>;

function elapsed(s: Session): number {
  return Date.now() - s.wallT0;
}

function metaFor(
  s: Session,
): Omit<RecordingMeta, 'durationMs' | 'frameCount' | 'bytes'> {
  const stamp = new Date(s.nameStamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  const label =
    `${stamp.getFullYear()}-${pad(stamp.getMonth() + 1)}-${pad(
      stamp.getDate(),
    )}` +
    ` ${pad(stamp.getHours())}:${pad(stamp.getMinutes())}:${pad(
      stamp.getSeconds(),
    )}`;

  const name = s.opMode ? `${s.opMode} ${label}` : label;

  return {
    id: s.id,
    name: s.split ? `${name} (part ${s.part})` : name,
    opMode: s.opMode,
    createdAt: s.createdAt,
    robotT0: 0,
    channels: { telemetry: s.sawTelemetry, field: s.sawField },
    origin: 'recorded',
    // evictAuto keys on `pinned` alone: false here puts a recording the user
    // asked for by name into the rolling ten-deep auto window.
    pinned: s.manual,
    ...(s.joined ? { joined: true } : {}),
  };
}

function clearTimers() {
  if (flushTimer !== null) clearInterval(flushTimer);
  if (statsTimer !== null) clearInterval(statsTimer);
  flushTimer = null;
  statsTimer = null;
}

/** Once whatever flush is queued has run, so eviction cannot take it first. */
function letGo(s: Session) {
  void s.saving.then(() => releaseOpen(s.id, 'recorder'));
}

/** Serialised, or two flushes at once both drain and store the same frames. */
function persist(store: Store, s: Session, final: boolean): Promise<void> {
  const run = () => flush(store, s, final);
  s.saving = s.saving.then(run, run);
  return s.saving;
}

function finish(store: Store, s: Session) {
  const saved = persist(store, s, true);
  if (s.manual) return;
  finishing.add(s);
  const done = () => {
    finishing.delete(s);
    // At once, so a visible tab can take the lease before the next run.
    if (renewTimer !== null) renewLease(store);
  };
  void saved.then(done, done);
}

async function flush(store: Store, s: Session, final: boolean) {
  if (s.closed || (!s.dirty && !final)) return;

  // An empty session would take an auto-keep slot from a real match, and a
  // flush may already have saved it.
  if (final && s.encoder.stats().frames === 0) {
    s.dirty = false;
    if (s.everSaved) {
      try {
        await remove(s.id);
      } catch {
        // Best effort; a row that outlives this is deletable by hand.
      }
      store.dispatch(setRecorderState({ savedCount: ++savedCount }));
    }
    return;
  }

  // A lost link's own flush has usually stored everything by the final one.
  if (s.dirty && !(await write(store, s, final))) return;

  if (final && s.everSaved) {
    // Finished, so it counts toward the recordings eviction keeps.
    releaseOpen(s.id, 'recorder');
    try {
      await evictAuto();
    } catch {
      // The recording is saved; the next finished one evicts again.
    }
    noteLibraryChanged();
    store.dispatch(setRecorderState({ savedCount: ++savedCount }));
  }
}

async function write(store: Store, s: Session, final: boolean) {
  s.dirty = false;
  const drainedAt = Date.now();
  const chunk = s.encoder.drain();
  const meta = { ...metaFor(s), ...s.encoder.summary() };
  const bytes = meta.bytes - s.savedBytes;
  let result: AppendResult;
  try {
    result = await writeChunk(s, meta, chunk, bytes).catch(async (err) => {
      if (!final) throw err;
      // Nothing flushes after this; a passing fault would lose the run's end.
      await new Promise((resolve) => setTimeout(resolve, FINAL_RETRY_MS));
      return writeChunk(s, meta, chunk, bytes);
    });
  } catch (err) {
    // Nothing is lost yet: the next flush drains all of this again.
    if (!final && !isQuotaExceeded(err) && ++s.failures < MAX_FLUSH_FAILURES) {
      s.dirty = true;
      return false;
    }
    saveFailed = true;
    if (!s.manual || adopted !== null || holdsRecorder()) {
      handedOverAt = Date.now();
      releaseRecorder();
      const opMode = s.manual ? adopted ?? armedOpMode ?? '' : s.opMode;
      // An ended run waits out the backoff, or is saved as the next begins.
      gaveUp = { opMode, savedTo: s.savedTo, ended: final };
      retryAfter = Math.min(
        BACKLOG_MAX_MS,
        Math.max(RECORDER_STALE_MS, 2 * retryAfter),
      );
    }
    abandon(store, s, err);
    return false;
  }

  // Gone after a successful save: deleted here mid-run, or storage was cleared.
  if (result === 'missing') {
    s.closed = true;
    if (!wasRemovedHere(s.id)) {
      abandon(
        store,
        s,
        new Error(
          'it disappeared from browser storage while recording. Site data ' +
            'may have been cleared, or it was deleted in another tab.',
        ),
      );
    } else {
      // Latched like a manual stop, or the next poll records it again.
      suppressedOpMode = armedOpMode ?? (s.manual ? null : s.opMode);
      if (session === s) stopSession(store, false);
    }
    return false;
  }
  s.encoder.commit(chunk);
  s.failures = 0;
  saveFailed = false;
  retryAfter = 0;
  s.savedBytes = meta.bytes;
  s.savedTo = drainedAt;
  s.everSaved = true;
  s.savedName = meta.name;
  return true;
}

async function writeChunk(
  s: Session,
  meta: RecordingMeta,
  chunk: RecordingChunk,
  bytes: number,
): Promise<AppendResult> {
  const opts = {
    mustExist: s.everSaved,
    ownName: s.savedName ?? meta.name,
    bytes,
  };
  try {
    return await appendChunk(meta, chunk, opts);
  } catch (err) {
    if (!isQuotaExceeded(err)) throw err;
    // A small chunk takes twice its size on disk; the last write may overshoot.
    await evictForSpace(4 * bytes);
    return appendChunk(meta, chunk, opts);
  }
}

/** Ends a session whose data cannot be stored. Latched like a manual stop, or
 *  the next status poll re-arms the same run and fails the same way. */
function abandon(store: Store, s: Session, err: unknown) {
  s.closed = true;
  store.dispatch(
    setPlaybackError(`Could not save recording: ${describeStorageError(err)}`),
  );
  store.dispatch(setRecorderState({ savedCount: ++savedCount }));
  if (session !== s && suspended !== s) return;

  letGo(s);
  if (session === s) {
    clearTimers();
    session = null;
  }
  if (suspended === s) takeSuspended();
  suppressedOpMode = armedOpMode ?? (s.manual ? null : s.opMode);
  store.dispatch(
    setRecorderState({
      active: false,
      frames: 0,
      bytes: 0,
      elapsedMs: 0,
      durationMs: 0,
      id: null,
    }),
  );
}

function emitStats(store: Store) {
  const s = session;
  if (!s) return;
  if (rollOverAtCap(store, s)) return;

  const stats = s.encoder.stats();
  store.dispatch(
    setRecorderState({
      active: true,
      id: s.id,
      frames: stats.frames,
      bytes: stats.bytes,
      elapsedMs: elapsed(s),
      durationMs: stats.durationMs,
    }),
  );
}

function startSession(
  store: Store,
  opMode: string,
  manual: boolean,
  continues?: Session,
  orphan?: RecorderLease,
): Session | null {
  if (session) return null;

  const s = newSession(opMode, manual, continues, orphan);
  session = s;
  holdOpen(s.id, 'recorder');
  startTimers(store);
  // Marked as recording at once, so a visible tab does not take it mid-run.
  if (!manual) renewLease(store);

  store.dispatch(setRecorderState({ active: true, id: s.id }));
  return s;
}

function newSession(
  opMode: string,
  manual: boolean,
  continues?: Session,
  orphan?: RecorderLease,
): Session {
  const now = Date.now();
  // A part with no frames is deleted as it ends, so this one takes its place.
  const carried =
    continues !== undefined && continues.encoder.stats().frames > 0;
  const run = manual || continues ? [] : runFrom(orphan?.savedTo ?? now);
  const startedAtReset = run[0]?.start === true;
  // Pruned by now, as no batch may have come to prune them, but a takeover,
  // which a throttled tab may make long after, keeps what it has of the run.
  const seed = orphan ? run : run.filter((b) => now - b.wall <= BACKLOG_MS);
  const wallT0 = seed.length > 0 ? seed[0].wall : now;
  const s: Session = {
    id: newRecordingId(),
    encoder: createEncoder(),
    wallT0,
    opMode,
    createdAt: wallT0,
    sawTelemetry: continues?.sawTelemetry ?? false,
    sawField: continues?.sawField ?? false,
    lastStatusSampleMs: -Infinity,
    lastStatusSampled: undefined,
    dirty: false,
    everSaved: false,
    closed: false,
    failures: 0,
    savedBytes: 0,
    savedTo: continues?.savedTo ?? wallT0,
    manual,
    saving: Promise.resolve(),
    part: continues ? continues.part + (carried ? 1 : 0) : 1,
    split: continues?.split === true,
    nameStamp: continues?.nameStamp ?? now,
    savedName: undefined,
    provisional: false,
    sawRunning: false,
    startedAtReset,
    joined: orphan
      ? !startedAtReset
      : (continues && armedOpMode !== null) || undefined,
  };

  // Keys sent once at init would otherwise be missing from every later part.
  if (continues && carried) {
    s.encoder.addBatch([continues.encoder.carry()], 0);
    s.encoder.addMarker({
      t: 0,
      kind: 'opmode',
      text: `${opMode || 'Recording'} continued from part ${continues.part}`,
    });
    s.dirty = true;
  }
  for (const batch of seed) {
    s.encoder.addBatch(batch.packets, batch.wall - s.wallT0);
    noteContent(s, batch.packets);
    s.dirty = true;
  }
  for (const { wall, status } of orphan ? seenStatus : []) {
    if (wall >= wallT0) s.encoder.addStatus(status, wall - wallT0);
  }
  return s;
}

function noteContent(s: Session, packets: TelemetryItem[]) {
  for (const p of packets) {
    if (Object.keys(p.data ?? {}).length > 0 || (p.log?.length ?? 0) > 0) {
      s.sawTelemetry = true;
    }
    if ((p.fieldOverlay?.ops?.length ?? 0) > 0) s.sawField = true;
  }
}

/** Finalizes a session that reached RECORDING_CAP and carries on in a new
 *  part, if it was started by hand or its op mode is still running. */
function rollOverAtCap(store: Store, s: Session): boolean {
  const stats = s.encoder.stats();
  if (
    elapsed(s) < RECORDING_CAP.durationMs &&
    stats.bytes < RECORDING_CAP.bytes
  ) {
    return false;
  }

  clearTimers();
  session = null;
  const carryOn = s.manual || armedOpMode === s.opMode;
  if (carryOn && stats.frames > 0) s.split = true;
  s.dirty = true;
  finish(store, s);
  letGo(s);

  if (carryOn) {
    startSession(store, s.opMode, s.manual, s);
  } else {
    store.dispatch(
      setRecorderState({
        active: false,
        frames: 0,
        bytes: 0,
        elapsedMs: 0,
        durationMs: 0,
        id: null,
      }),
    );
  }
  return true;
}

// Chunked flushes: a crash or refresh costs one interval, not the whole match.
function startTimers(store: Store) {
  clearTimers();
  flushedAt = Date.now();
  flushTimer = setInterval(() => flushNow(store), FLUSH_INTERVAL_MS);
  statsTimer = setInterval(() => emitStats(store), STATS_INTERVAL_MS);
}

function flushNow(store: Store) {
  flushedAt = Date.now();
  if (session) void persist(store, session, false);
}

function takeSuspended(): Session | null {
  const s = suspended;
  suspended = null;
  if (suspendTimer !== null) clearTimeout(suspendTimer);
  suspendTimer = null;
  return s;
}

function resumeOrRetire(
  store: Store,
  runningOpMode: string | null,
  status: string | undefined,
) {
  // INIT after RUNNING is the same op mode run again while the link was down.
  const rejoinable =
    suspended !== null &&
    session === null &&
    runningOpMode !== null &&
    runningOpMode === suspended.opMode &&
    !(suspended.sawRunning && status === OpModeStatus.INIT) &&
    Date.now() - suspendedAt <= RESUME_WINDOW_MS;

  const s = takeSuspended();
  if (!s) return;

  if (rejoinable) {
    rejoin(s);
    session = s;
    startTimers(store);
    store.dispatch(setRecorderState({ active: true, id: s.id }));
    return;
  }

  retire(store, s);
}

/** The run may have restarted unseen, so its keys are cleared and the break is
 *  marked. What arrived before this status is taken from the pre-roll. */
function rejoin(s: Session) {
  const missed = preroll.filter((b) => b.wall > suspendedAt);
  const back = Math.min(missed[0]?.wall ?? Date.now(), Date.now());
  s.encoder.addBatch([], back - s.wallT0);
  s.encoder.addMarker({
    t: back - s.wallT0,
    kind: 'log',
    text: `Link to the robot lost for ${((back - suspendedAt) / 1000).toFixed(
      1,
    )} s`,
  });
  for (const batch of missed) {
    s.encoder.addBatch(batch.packets, batch.wall - s.wallT0);
    noteContent(s, batch.packets);
  }
  s.dirty = true;
}

function retire(store: Store, s: Session) {
  finish(store, s);
  letGo(s);
  store.dispatch(
    setRecorderState({
      active: false,
      frames: 0,
      bytes: 0,
      elapsedMs: 0,
      durationMs: 0,
      id: null,
    }),
  );
}

/** Ends a provisional session that the robot's status disowned. */
function discard(store: Store, s: Session) {
  stopSession(store, false);
  void s.saving.then(async () => {
    if (s.everSaved) await remove(s.id).catch(() => undefined);
  });
}

function stopSession(store: Store, finalize: boolean) {
  const s = session;
  clearTimers();
  session = null;

  if (s && finalize) finish(store, s);
  if (s) letGo(s);

  // persist() silently declines to save a session that captured nothing, so a
  // hand-started one has to explain itself. Automatic sessions stay silent.
  if (s && finalize && s.manual && s.encoder.stats().frames === 0) {
    store.dispatch(
      setPlaybackError(
        'Nothing to record: the robot sent no telemetry while that was running. ' +
          'Telemetry only flows while an op mode is running.',
      ),
    );
  }

  store.dispatch(
    setRecorderState({
      active: false,
      frames: 0,
      bytes: 0,
      elapsedMs: 0,
      durationMs: 0,
      id: null,
    }),
  );
}

function handingOver() {
  return Date.now() - handedOverAt < RECORDER_STALE_MS;
}

/** Stops a session whose lease another tab took while this one stalled. */
function renewLease(store: Store) {
  if (leaving || handingOver()) return;
  renewedAt = Date.now();
  // A session started by hand in the holder is the run's only recording.
  const auto =
    session && (!session.manual || adopted !== null || holdsRecorder())
      ? session
      : suspended;
  const open = [...(auto ? [auto] : []), ...finishing];
  void claimRecorder(
    {
      visible: document.visibilityState === 'visible' && !saveFailed,
      recording: open.length > 0,
      opMode: adopted ?? (auto?.manual ? armedOpMode : open[0]?.opMode) ?? '',
      savedTo: Math.min(Date.now(), ...open.map((o) => o.savedTo)),
    },
    bufferedSince,
    lastSeen && Date.now() - lastSeen.at < STATUS_FRESH_MS
      ? lastSeen.opMode
      : undefined,
  ).then((orphan) => {
    if (handingOver()) {
      releaseRecorder();
      return;
    }
    const elsewhere = recorderHeldElsewhere();
    if (store.getState().playback.recorder.elsewhere !== elsewhere) {
      store.dispatch(setRecorderState({ elsewhere }));
    }
    if (elsewhere || orphan) gaveUp = null;
    const own = gaveUp;
    if (orphan) takeOver(store, orphan);
    else if (
      own &&
      ((armedOpMode === null && !own.ended) ||
        Date.now() - handedOverAt >= retryAfter)
    ) {
      gaveUp = null;
      const lease = { holder: '', until: 0, visible: false, recording: true };
      takeOver(store, { ...lease, ...own });
    }
    if (!elsewhere) return;
    if (session && !session.manual) stopSession(store, true);
    if (suspended) retire(store, takeSuspended() as Session);
  });
}

/** Saves the rest of a run whose holder crashed or closed, even if it ended. */
function takeOver(store: Store, orphan: RecorderLease) {
  const unsaved = (before: number) =>
    preroll.some(
      (b) => b.wall > orphan.savedTo && b.wall < before && b.packets.length > 0,
    );
  if (suspended || !isIndexedDbAvailable()) return;
  if (!store.getState().playback.recorder.enabled) return;
  if (suppressedOpMode === orphan.opMode) suppressedOpMode = null;
  // After a gap since the holder's save, its telemetry may be a later run's.
  const hasRest =
    (bufferedSince ?? Infinity) <= orphan.savedTo ||
    armedOpMode === orphan.opMode;
  if (!hasRest) return;
  if (session?.manual) {
    adopted = orphan.opMode;
    renewLease(store);
    if (!unsaved(session.wallT0)) return;
    const s = newSession(orphan.opMode, false, undefined, orphan);
    holdOpen(s.id, 'recorder');
    finish(store, s);
    letGo(s);
  } else if (!session && unsaved(Infinity)) {
    startSession(store, orphan.opMode, false, undefined, orphan);
    flushNow(store);
  }
}

function followLease(store: Store, enabled: boolean) {
  if (renewTimer !== null) clearInterval(renewTimer);
  renewTimer = null;
  bufferedSince = null;
  if (!enabled) {
    releaseRecorder();
    return;
  }
  renewTimer = setInterval(() => renewLease(store), LEASE_RENEW_MS);
  renewLease(store);
  if (leaseWatched) return;
  leaseWatched = true;
  const renew = () => {
    if (renewTimer !== null) renewLease(store);
  };
  window.addEventListener('pagehide', () => {
    leaving = true;
    releaseRecorder();
  });
  window.addEventListener('pageshow', () => {
    leaving = false;
  });
  document.addEventListener('visibilitychange', renew);
  window.addEventListener('storage', (e) => {
    if (e.key !== RECORDER_LEASE_KEY) return;
    renew();
    // Asked to renew, it may be that another tab has seen its run end.
    if (
      document.visibilityState === 'hidden' &&
      session &&
      (!session.manual || holdsRecorder())
    ) {
      store.dispatch({ type: GET_ROBOT_STATUS });
    }
  });
}

/** Middleware, not RecorderView, so recording keeps working when the tile
 *  is not in the layout and cannot leak an interval on unmount. */
const recorderMiddleware: Middleware<Record<string, unknown>, RootState> =
  (store) => (next) => (action) => {
    // Observe only. Swallowing an action here would break downstream reducers.
    const result = next(action);
    const state = store.getState();
    const api = store as unknown as Store;

    switch (action.type) {
      case RECORDER_START: {
        const warning = storageWarning();
        if (warning) {
          store.dispatch(setPlaybackError(warning));
          break;
        }
        const op = state.status.activeOpMode;
        suppressedOpMode = null;
        if (suspended) retire(api, takeSuspended() as Session);
        startSession(api, op && op !== STOP_OP_MODE_TAG ? op : '', true);
        break;
      }

      case RECORDER_STOP: {
        // The suspended session's op mode: a lost link forgets the armed one.
        const stopped = suspended ?? session;
        if (suspended) retire(api, takeSuspended() as Session);
        // Latched, or the next poll records the same match under a new name.
        const latch =
          !stopped?.manual || (holdsRecorder() && adopted !== armedOpMode);
        suppressedOpMode = latch
          ? armedOpMode ?? (stopped?.opMode || null)
          : null;
        adopted = null;
        stopSession(api, true);
        break;
      }

      case RECORDER_SET_ENABLED: {
        const enabled = Boolean((action as { enabled: boolean }).enabled);
        try {
          window.localStorage.setItem(RECORDER_ENABLED_KEY, String(enabled));
        } catch {
          // A full or disabled localStorage makes the preference per-session.
        }
        // It reads "record op modes automatically", so it governs only those.
        if (!enabled && suspended && !suspended.manual) {
          retire(api, takeSuspended() as Session);
        }
        if (!enabled && session && !session.manual) stopSession(api, true);
        break;
      }

      case RECEIVE_ROBOT_STATUS: {
        const status = (action as ReceiveRobotStatusAction).status;
        if (!status) break;

        retryStorage();
        if (isIndexedDbAvailable() !== storageWasAvailable) {
          storageWasAvailable = !storageWasAvailable;
          store.dispatch(libraryChanged());
        }

        if (state.playback.recorder.enabled) rememberStatus(status);
        const current = status.activeOpModeStatus ?? OpModeStatus.STOPPED;
        const runningOpMode = activeOpModeName(status);
        const previousOpMode = armedOpMode;
        armedOpMode = runningOpMode;
        if (adopted !== runningOpMode) adopted = null;

        // Settled before any arming decision below, or a second session starts.
        resumeOrRetire(api, runningOpMode, status.activeOpModeStatus);

        // Level-triggered: only the op mode *name* tells a run from the pit.
        if (suppressedOpMode !== null && runningOpMode !== suppressedOpMode) {
          suppressedOpMode = null;
        }

        const shouldRecord =
          runningOpMode !== null &&
          runningOpMode !== suppressedOpMode &&
          state.playback.recorder.enabled &&
          isIndexedDbAvailable();

        telemetryStartBlocked = runningOpMode === null;
        if (session?.provisional) {
          if (shouldRecord) {
            session.opMode = runningOpMode ?? '';
            session.provisional = false;
          } else {
            discard(api, session);
          }
        }

        // Only automatic sessions answer to the robot; the 1 Hz poll has no
        // opinion about a hand-started one.
        if (
          session &&
          !session.manual &&
          (!shouldRecord || runningOpMode !== session.opMode)
        ) {
          stopSession(api, true);
        }
        if (shouldRecord && !session && holdsRecorder()) {
          startSession(api, runningOpMode ?? '', false);
        }

        if (session) {
          const t = elapsed(session);
          if (status.activeOpModeStatus === OpModeStatus.RUNNING) {
            session.sawRunning = true;
          }
          // Joined unless, with the link up since, it began at the INIT reset
          // or a fresh status before its first RUNNING was idle or INIT.
          if (
            session.joined === undefined &&
            runningOpMode !== null &&
            status.activeOpModeStatus === OpModeStatus.RUNNING
          ) {
            session.joined = !(
              lastSeen !== null &&
              (session.startedAtReset ||
                (Date.now() - lastSeen.at < STATUS_FRESH_MS &&
                  (lastSeen.opMode === null ||
                    (lastSeen.opMode === runningOpMode &&
                      lastSeen.status === OpModeStatus.INIT))))
            );
          }
          // On every change, not only on the interval: status is polled once a
          // second, and compare mode aligns on the first poll after START.
          const changed =
            status.activeOpModeStatus !== session.lastStatusSampled;
          if (
            changed ||
            t - session.lastStatusSampleMs >= STATUS_SAMPLE_INTERVAL_MS
          ) {
            session.lastStatusSampled = status.activeOpModeStatus;
            session.lastStatusSampleMs = t;
            session.encoder.addStatus(
              {
                activeOpMode: status.activeOpMode,
                activeOpModeStatus: status.activeOpModeStatus,
                batteryVoltage: status.batteryVoltage,
              },
              t,
            );
            session.dirty = true;
          }

          if (previousOpMode !== runningOpMode || t === 0) {
            session.encoder.addMarker({
              t,
              kind: 'opmode',
              text: `${status.activeOpMode || 'opmode'} ${current}`,
            });
            session.dirty = true;
          }
        }
        lastSeen = {
          opMode: runningOpMode,
          status: status.activeOpModeStatus,
          at: Date.now(),
        };
        break;
      }

      case RECEIVE_CONNECTION_STATUS: {
        // A drop across one match's end and the next's start leaves the first
        // session open, landing both matches in one file named after the first.
        const linked = (action as { isConnected?: boolean }).isConnected;
        if (linked && bufferedSince === null) bufferedSince = Date.now();
        if (!linked) {
          bufferedSince = null;
          armedOpMode = null;
          lastSeen = null;
          preroll = [];
          dataSeenAt = Date.now();
          // A hand-started session is a span the user chose, so a flaky link
          // mid-span leaves a gap rather than throwing the span away.
          if (session && !session.manual) {
            // An unknown status for the gap, so the track does not bridge it.
            session.encoder.addStatus(
              { activeOpMode: session.opMode },
              elapsed(session),
            );
            session.lastStatusSampled = undefined;
            // Flushed first, in case the link never comes back.
            session.dirty = true;
            void persist(api, session, false);
            suspended = session;
            suspendedAt = Date.now();
            session = null;
            clearTimers();
            suspendTimer = setTimeout(() => {
              const s = takeSuspended();
              if (s) retire(api, s);
            }, RESUME_WINDOW_MS);
            // Deliberately still 'active': reporting stopped-then-started would
            // flicker the panel through a state it was never in.
          }
        }
        break;
      }

      // Upstream of playbackMiddleware, so reviewing does not stop capturing.

      case RECEIVE_TELEMETRY: {
        const telemetryAction = action as ReceiveTelemetryAction;
        // Replayed batches re-enter the chain from the top, so without this the
        // recorder records its own playback back into the file.
        if (telemetryAction.__replay) break;

        const packets = telemetryAction.telemetry ?? [];
        const enabled = state.playback.recorder.enabled;
        const wall = Date.now();
        const start =
          packets.length === 0 &&
          wall - dataSeenAt >= RESET_QUIET_MS &&
          !(
            lastSeen?.opMode &&
            lastSeen.status === OpModeStatus.RUNNING &&
            wall - lastSeen.at < STATUS_FRESH_MS
          );
        if (packets.length > 0) dataSeenAt = wall;
        if (enabled && Date.now() - renewedAt >= LEASE_RENEW_MS) {
          renewLease(api);
        }
        if (packets.length === 0) telemetryStartBlocked = false;
        // A latch from a failed save lasts only until the next run begins.
        if (start && saveFailed) suppressedOpMode = null;
        if (start && gaveUp && !session && !suspended) {
          takeOver(api, {
            holder: '',
            until: 0,
            visible: false,
            recording: true,
            ...gaveUp,
          });
          if (session) stopSession(api, true);
        }
        if (start) gaveUp = null;
        // Telemetry flows only while an op mode runs, and a hidden tab polls
        // status once a minute, so this may be the only sign a run began.
        if (
          enabled &&
          !session &&
          !suspended &&
          packets.length > 0 &&
          suppressedOpMode === null &&
          !telemetryStartBlocked &&
          isIndexedDbAvailable() &&
          holdsRecorder()
        ) {
          const s = startSession(api, armedOpMode ?? '', false);
          if (s && armedOpMode === null) {
            s.provisional = true;
            // Polls are throttled only when hidden; a reply skews the ping.
            if (document.visibilityState === 'hidden') {
              store.dispatch({ type: GET_ROBOT_STATUS });
            }
          }
        }
        if (enabled) remember(packets, wall, start);
        else preroll = [];
        if (!session) break;

        // Zero-length batches are recorded too: they are the opmode pre-init
        // reset, and dropping one bleeds stale keys across runs.
        session.encoder.addBatch(packets, elapsed(session));
        session.dirty = true;
        noteContent(session, packets);
        if (Date.now() - flushedAt >= FLUSH_LATE_MS) flushNow(api);
        rollOverAtCap(api, session);
        break;
      }

      case RECEIVE_LOGCAT_ERRORS: {
        if (!session) break;

        const errors = (action as ReceiveLogcatErrorsAction).errors ?? [];
        const now = elapsed(session);
        for (const e of errors) {
          // Errors and warnings, at the robot's stamp: lines arrive in tens.
          if (!MARKED_LEVELS.has(e.level)) continue;
          const t = session.encoder.robotTime(e.timestamp) ?? now;
          if (t < 0) continue;
          session.encoder.addMarker({
            t: Math.min(t, now),
            kind: ERROR_LEVELS.has(e.level) ? 'error' : 'log',
            text: `${e.tag}: ${e.message}`.slice(0, 500),
          });
          session.dirty = true;
        }
        break;
      }

      default:
        break;
    }

    // After the setting is stored, which other tabs must see before a release.
    if (state.playback.recorder.enabled !== (renewTimer !== null)) {
      followLease(api, state.playback.recorder.enabled);
    }
    return result;
  };

export default recorderMiddleware;
