import OpModeStatus from '@/enums/OpModeStatus';
import type { DrawOp, TelemetryItem } from '@/store/types/telemetry';
import type { RobotStatus } from '@/store/types/status';

/** Version 3 added `sets`. Version 2 files decode and replay as before. */
export const RECORDING_VERSION = 3;

/** Several full matches, so only a run left going in the pit reaches it. */
export const RECORDING_CAP = {
  durationMs: 30 * 60 * 1000,
  bytes: 100 * 1024 * 1024,
};

/** A stalled link delivers packets late, never early, but a server that drops
 *  packets while stalled can open a real gap of a couple of seconds. */
const CLOCK_STEP_BACK_MS = 1000;
const CLOCK_STEP_AHEAD_MS = 5000;

/** Keyframe spacing. Bounds a seek to at most this many forward folds. */
const KEYFRAME_INTERVAL = 50;

/** Frame flag: this frame is the server's zero-length batch. */
export const FLAG_CLEAR = 1;

/** Anything else reaches Field.js's `default` branch and throws from inside the
 *  playback loop, so imported recordings are filtered against this. */
const KNOWN_OP_TYPES = new Set([
  'scale',
  'rotation',
  'translate',
  'fill',
  'stroke',
  'strokeWidth',
  'circle',
  'polygon',
  'polyline',
  'spline',
  'image',
  'text',
  'grid',
  'alpha',
]);

export type MarkerKind = 'log' | 'error' | 'opmode';

export type Marker = {
  t: number;
  kind: MarkerKind;
  text: string;
};

export type StatusSample = [number, Partial<RobotStatus>];

export type RecordingMeta = {
  id: string;
  name: string;
  opMode: string;
  createdAt: number;
  /** First recorded packet's own timestamp, so exports can be re-aligned. */
  robotT0: number;
  durationMs: number;
  frameCount: number;
  bytes: number;
  channels: {
    telemetry: boolean;
    field: boolean;
  };
  origin: 'recorded' | 'imported';
  /** Set by rename, export, import or Record now. Pinned is never evicted. */
  pinned: boolean;
  /** Began after its run did, so it has no op mode start to line up on. */
  joined?: boolean;
};

/** `dataDelta` merges, `log` replaces, and a null ref means unchanged from the
 *  previous frame. */
export type Frame = [
  t: number,
  dataDelta: Record<string, string> | null,
  log: string[] | null,
  overlayRef: number | null,
  fieldRef: number | null,
  flags?: number,
  extraRef?: number | null,
  keySetRef?: number | null,
];

export type Keyframe = {
  /** Index of the frame this snapshot reflects, inclusive. */
  f: number;
  t: number;
  data: Record<string, string>;
  log: string[];
  o: number;
  fd: number;
  x: number;
  k?: number;
  lo?: number;
  lf?: number;
};

export type Recording = {
  v: typeof RECORDING_VERSION;
  id: string;
  meta: RecordingMeta;
  /** Telemetry key dictionary. Frame deltas index into this. */
  keys: string[];
  /** Interned draw-op arrays. Index 0 is always empty. */
  dict: DrawOp[][];
  /** Interned unknown packet fields, so a future dashboard's data survives a
   *  round trip. Index 0 is always empty. */
  xdict: Record<string, unknown>[];
  /** Interned lists of the key indices each packet carried, since a delta
   *  cannot say that a key went unsent. Empty in a version 2 recording. */
  sets: number[][];
  frames: Frame[];
  index: Keyframe[];
  status: StatusSample[];
  markers: Marker[];
};

/** A contiguous slice of a recording, as one flush appends it. Each base is the
 *  slice's offset in the recording, which frame refs and keyframes index. */
export type RecordingChunk = {
  base: {
    frames: number;
    keys: number;
    dict: number;
    xdict: number;
    sets?: number;
  };
  keys: string[];
  dict: DrawOp[][];
  xdict: Record<string, unknown>[];
  sets: number[][];
  frames: Frame[];
  index: Keyframe[];
  status: StatusSample[];
  markers: Marker[];
};

export type FoldedState = {
  data: Record<string, string>;
  log: string[];
  /** Whether the frame just applied carried `log`. The track has replace
   *  semantics, so replaying it verbatim re-emits lines on every packet. */
  logFresh: boolean;
  o: number;
  fd: number;
  x: number;
  /** The last frame's key set, or null when the recording has none. */
  k: number | null;
  /** The last non-empty overlay and the background sent with it: what the
   *  Field shows, as the server strips all but one packet's overlay a batch. */
  lo: number;
  lf: number;
  /** Index of the last frame applied, or -1 if none. */
  frameIdx: number;
};

const PACKET_KNOWN_FIELDS = new Set([
  'data',
  'log',
  'field',
  'fieldOverlay',
  'timestamp',
  'recordedMs',
  'seed',
]);

function frameFlags(f: Frame): number {
  return f[5] ?? 0;
}

function frameExtraRef(f: Frame): number | null {
  return f[6] ?? null;
}

function frameKeySetRef(f: Frame): number | null {
  return f[7] ?? null;
}

/** Stable enough to intern by: op arrays come off the wire in field order. */
function internKey(value: unknown): string {
  return JSON.stringify(value);
}

/** A moving robot's overlay never repeats, so deduplicating against every value
 *  ever seen would hold the whole run in memory for no gain. */
const RECENT_INTERN_COUNT = 64;
const RECENT_INTERN_BYTES = 1024 * 1024;

class Interner<T> {
  /** Values not yet released; values[0] has index `base`. */
  readonly values: T[] = [];
  base = 0;
  /** A moving robot interns an overlay per frame: most of the recording. */
  bytes = 0;
  private count = 1;
  private readonly emptyKey: string;
  private readonly recent = new Map<string, number>();
  private recentBytes = 0;

  constructor(empty: T) {
    this.values.push(empty);
    this.emptyKey = internKey(empty);
  }

  intern(value: T): number {
    const key = internKey(value);
    if (key === this.emptyKey) return 0;

    const existing = this.recent.get(key);
    if (existing !== undefined) {
      // Re-inserted so a value sent all run, like the field background, stays.
      this.recent.delete(key);
      this.recent.set(key, existing);
      return existing;
    }

    const idx = this.count;
    this.count += 1;
    this.values.push(value);
    this.bytes += key.length;

    this.recent.set(key, idx);
    this.recentBytes += key.length;
    while (
      this.recent.size > 1 &&
      (this.recent.size > RECENT_INTERN_COUNT ||
        this.recentBytes > RECENT_INTERN_BYTES)
    ) {
      const oldest = this.recent.keys().next().value as string;
      this.recent.delete(oldest);
      this.recentBytes -= oldest.length;
    }
    return idx;
  }

  release(n: number) {
    this.values.splice(0, n);
    this.base += n;
  }
}

export type EncoderStats = {
  frames: number;
  bytes: number;
  durationMs: number;
};

export type EncoderSummary = Pick<
  RecordingMeta,
  'robotT0' | 'durationMs' | 'frameCount' | 'bytes'
>;

export type Encoder = {
  addBatch(packets: TelemetryItem[], wallElapsedMs: number): void;
  addStatus(status: Partial<RobotStatus>, wallElapsedMs: number): void;
  addMarker(marker: Marker): void;
  /** A robot timestamp on the recording's clock, or null before a packet. */
  robotTime(timestamp: number): number | null;
  stats(): EncoderStats;
  summary(): EncoderSummary;
  /** Everything added since the last commit. Nothing is released until then,
   *  so a failed write can be retried with the next flush's data appended. */
  drain(): RecordingChunk;
  commit(chunk: RecordingChunk): void;
  /** The current fold as one packet, for a continuation to start from. */
  carry(): TelemetryItem;
};

export function createEncoder(): Encoder {
  // Each array holds only what is not yet committed; its base is its offset.
  const keys: string[] = [];
  let keysBase = 0;
  const keyIndex = new Map<string, number>();
  const ops = new Interner<DrawOp[]>([]);
  const extras = new Interner<Record<string, unknown>>({});
  const sets = new Interner<number[]>([]);

  const frames: Frame[] = [];
  let framesBase = 0;
  const index: Keyframe[] = [];
  const status: StatusSample[] = [];
  const markers: Marker[] = [];
  let markerCount = 0;
  let lastStatusT = 0;
  let lastMarkerT = 0;

  // Running fold, so keyframes and deltas can be computed in one pass.
  let data: Record<string, string> = {};
  let log: string[] = [];
  let overlayRef = 0;
  let fieldRef = 0;
  let extraRef = 0;
  let setRef = 0;
  let shownOverlay = 0;
  let shownField = 0;
  let shownOps: { overlay: DrawOp[]; field: DrawOp[] } = {
    overlay: [],
    field: [],
  };
  let extraFields: Record<string, unknown> = {};

  let robotT0 = Number.NaN;
  /** Browser-elapsed time at robotT0's capture: both clocks share an origin. */
  let robotWallBase = 0;
  let lastT = 0;
  let lastPacketT = 0;
  let lastPacketWall = 0;
  let lastPacketTs = Number.NaN;
  let bytes = 0;

  function keyIdx(key: string): number {
    const existing = keyIndex.get(key);
    if (existing !== undefined) return existing;

    const idx = keysBase + keys.length;
    keys.push(key);
    keyIndex.set(key, idx);
    return idx;
  }

  function frameCount(): number {
    return framesBase + frames.length;
  }

  function pushKeyframeIfDue() {
    if (frameCount() % KEYFRAME_INTERVAL !== 0) return;

    index.push({
      f: frameCount() - 1,
      t: lastT,
      data: { ...data },
      log: [...log],
      o: overlayRef,
      fd: fieldRef,
      x: extraRef,
      k: setRef,
      lo: shownOverlay,
      lf: shownField,
    });
    // Each copies the whole fold: most of the size when telemetry is constant.
    bytes += internKey(index[index.length - 1]).length;
  }

  function pushFrame(f: Frame) {
    frames.push(f);
    // Rough, but enough for the size readout and far cheaper than stringifying.
    bytes += internKey(f).length;
    pushKeyframeIfDue();
  }

  /** Every track, plus the intern dictionaries a moving robot fills. */
  function totalBytes(): number {
    return bytes + ops.bytes + extras.bytes + sets.bytes;
  }

  /** All three tracks: an op mode pushing no telemetry still has status and
   *  marker history, and duration 0 collapses the transport bar. */
  function duration(): number {
    return Math.max(lastT, lastStatusT, lastMarkerT);
  }

  /** The robot's clock can be years off, so only its elapsed part is used: it
   *  is rebased onto the browser-elapsed origin of the status samples. */
  function relativeTime(packet: TelemetryItem, wallElapsedMs: number): number {
    const ts = packet.timestamp;
    if (typeof ts !== 'number' || !isFinite(ts) || ts <= 0)
      return wallElapsedMs;

    if (isNaN(robotT0)) {
      robotT0 = ts;
      robotWallBase = wallElapsedMs;
    } else if (
      ts - lastPacketTs < -CLOCK_STEP_BACK_MS ||
      ts - lastPacketTs - (wallElapsedMs - lastPacketWall) > CLOCK_STEP_AHEAD_MS
    ) {
      // The driver station set the robot's clock. Rebased so this packet
      // follows the last by the browser time between them.
      robotT0 = ts;
      robotWallBase = lastPacketT + Math.max(0, wallElapsedMs - lastPacketWall);
    }
    lastPacketTs = ts;

    const t = ts - robotT0 + robotWallBase;
    if (t < 0 || t > 24 * 60 * 60 * 1000) return wallElapsedMs;
    return t;
  }

  return {
    addBatch(packets, wallElapsedMs) {
      if (packets.length === 0) {
        // The deliberate clearing primitive. Never compress these away: they
        // are the pre-init reset; dropping one bleeds stale keys between runs.
        data = {};
        log = [];
        // Offset from the last packet by browser time, not put on the browser
        // clock: later timestamps are clamped to lastT, so a clear stamped
        // ahead of the robot clock would flatten the run. Server batching can
        // only make this early.
        lastT = isNaN(robotT0)
          ? Math.max(lastT, wallElapsedMs)
          : Math.max(lastT, lastPacketT + wallElapsedMs - lastPacketWall);
        pushFrame([lastT, null, null, null, null, FLAG_CLEAR]);
        return;
      }

      for (const packet of packets) {
        const t = Math.max(lastT, relativeTime(packet, wallElapsedMs));
        lastT = t;
        lastPacketT = t;
        lastPacketWall = wallElapsedMs;

        let dataDelta: Record<string, string> | null = null;
        const packetData = packet.data ?? {};
        const present: number[] = [];
        for (const k of Object.keys(packetData)) {
          const v = packetData[k];
          present.push(keyIdx(k));
          if (data[k] === v) continue;

          data[k] = v;
          if (dataDelta === null) dataDelta = {};
          dataDelta[String(keyIdx(k))] = v;
        }

        // No equality test: an empty-log packet never clears `log`, so
        // deduplicating drops a line that fired, went quiet and fired again.
        const packetLog = packet.log ?? [];
        let logDelta: string[] | null = null;
        if (packetLog.length > 0) {
          log = [...packetLog];
          logDelta = log;
        }

        const nextOverlay = ops.intern(packet.fieldOverlay?.ops ?? []);
        const nextField = ops.intern(packet.field?.ops ?? []);

        let extra: Record<string, unknown> | null = null;
        for (const k of Object.keys(packet)) {
          if (PACKET_KNOWN_FIELDS.has(k)) continue;
          if (extra === null) extra = {};
          extra[k] = (packet as unknown as Record<string, unknown>)[k];
        }
        const nextExtra = extra === null ? 0 : extras.intern(extra);
        const nextSet = sets.intern(present);

        const frame: Frame = [
          t,
          dataDelta,
          logDelta,
          nextOverlay === overlayRef ? null : nextOverlay,
          nextField === fieldRef ? null : nextField,
        ];
        if (nextExtra !== extraRef || nextSet !== setRef) {
          frame[5] = 0;
          frame[6] = nextExtra === extraRef ? null : nextExtra;
        }
        if (nextSet !== setRef) frame[7] = nextSet;

        overlayRef = nextOverlay;
        fieldRef = nextField;
        extraRef = nextExtra;
        setRef = nextSet;
        if (nextOverlay !== 0) {
          shownOverlay = nextOverlay;
          shownField = nextField;
          shownOps = {
            overlay: packet.fieldOverlay?.ops ?? [],
            field: packet.field?.ops ?? [],
          };
        }
        extraFields = extra ?? {};

        pushFrame(frame);
      }
    },

    addStatus(next, wallElapsedMs) {
      lastStatusT = Math.max(0, wallElapsedMs);
      const sample: StatusSample = [lastStatusT, next];
      status.push(sample);
      bytes += internKey(sample).length;
    },

    addMarker(marker) {
      // Room kept for op mode markers, which a burst of log lines crowds out.
      const cap =
        marker.kind === 'opmode'
          ? MAX_TIMELINE_ENTRIES
          : MAX_TIMELINE_ENTRIES - OPMODE_MARKER_RESERVE;
      if (markerCount >= cap) return;
      markerCount += 1;
      lastMarkerT = Math.max(lastMarkerT, marker.t);
      markers.push(marker);
      bytes += internKey(marker).length;
    },

    robotTime(timestamp) {
      if (isNaN(robotT0) || !isFinite(timestamp)) return null;
      return timestamp - robotT0 + robotWallBase;
    },

    stats() {
      return {
        frames: frameCount(),
        bytes: totalBytes(),
        durationMs: duration(),
      };
    },

    summary() {
      return {
        robotT0: isNaN(robotT0) ? 0 : robotT0,
        durationMs: duration(),
        frameCount: frameCount(),
        bytes: totalBytes(),
      };
    },

    drain() {
      return {
        base: {
          frames: framesBase,
          keys: keysBase,
          dict: ops.base,
          xdict: extras.base,
          sets: sets.base,
        },
        keys: [...keys],
        dict: [...ops.values],
        xdict: [...extras.values],
        sets: [...sets.values],
        frames: [...frames],
        index: [...index],
        status: [...status],
        markers: [...markers],
      };
    },

    commit(chunk) {
      if (chunk.base.frames !== framesBase || chunk.base.keys !== keysBase) {
        return;
      }
      frames.splice(0, chunk.frames.length);
      framesBase += chunk.frames.length;
      keys.splice(0, chunk.keys.length);
      keysBase += chunk.keys.length;
      ops.release(chunk.dict.length);
      extras.release(chunk.xdict.length);
      sets.release(chunk.sets.length);
      index.splice(0, chunk.index.length);
      status.splice(0, chunk.status.length);
      markers.splice(0, chunk.markers.length);
    },

    carry() {
      return {
        ...extraFields,
        timestamp: 0,
        data: { ...data },
        log: [],
        field: { ops: shownOps.field },
        fieldOverlay: { ops: shownOps.overlay },
      };
    },
  };
}

/** Chunks in sequence order back into one recording. Stops at the first chunk
 *  that does not start where the previous one ended, since every ref after a
 *  gap would name the wrong entry. */
export function joinChunks(
  id: string,
  meta: RecordingMeta,
  chunks: Partial<RecordingChunk>[],
): Recording {
  const rec: Recording = {
    v: RECORDING_VERSION,
    id,
    meta,
    keys: [],
    dict: [],
    xdict: [],
    sets: [],
    frames: [],
    index: [],
    status: [],
    markers: [],
  };
  const append = <T>(into: T[], from: T[] | undefined) => {
    if (!Array.isArray(from)) return;
    for (const item of from) into.push(item);
  };

  for (const c of chunks) {
    const base = c.base;
    if (
      base &&
      (base.frames !== rec.frames.length ||
        base.keys !== rec.keys.length ||
        base.dict !== rec.dict.length ||
        base.xdict !== rec.xdict.length ||
        (base.sets !== undefined && base.sets !== rec.sets.length))
    ) {
      break;
    }
    append(rec.keys, c.keys);
    append(rec.dict, c.dict);
    append(rec.xdict, c.xdict);
    append(rec.sets, c.sets);
    append(rec.frames, c.frames);
    append(rec.index, c.index);
    append(rec.status, c.status);
    append(rec.markers, c.markers);
  }

  return rec;
}

/** All of `rec` as the one chunk an import or a migrated row is stored as. */
export function wholeChunk(rec: Recording): RecordingChunk {
  return {
    base: { frames: 0, keys: 0, dict: 0, xdict: 0, sets: 0 },
    keys: rec.keys,
    dict: rec.dict,
    xdict: rec.xdict,
    sets: rec.sets,
    frames: rec.frames,
    index: rec.index,
    status: rec.status,
    markers: rec.markers,
  };
}

export type DecodedRecording = Recording;

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

/** Every field is normalized: this is also the trust boundary for imports. */
function decodeMeta(value: unknown, fallbackId: string): RecordingMeta {
  const m = (
    typeof value === 'object' && value !== null ? value : {}
  ) as Record<string, unknown>;
  const channels = (
    typeof m.channels === 'object' && m.channels !== null ? m.channels : {}
  ) as Record<string, unknown>;

  return {
    id: str(m.id, fallbackId),
    name: str(m.name, '').slice(0, 200),
    opMode: str(m.opMode, '').slice(0, 200),
    createdAt: num(m.createdAt, 0),
    robotT0: num(m.robotT0, 0),
    // A NaN duration NaNs transport-bar percentages; a huge one zeroes them.
    durationMs: Math.max(
      0,
      Math.min(num(m.durationMs, 0), 24 * 60 * 60 * 1000),
    ),
    frameCount: Math.max(0, num(m.frameCount, 0)),
    bytes: Math.max(0, num(m.bytes, 0)),
    channels: {
      telemetry: channels.telemetry === true,
      field: channels.field === true,
    },
    origin: m.origin === 'imported' ? 'imported' : 'recorded',
    pinned: m.pinned === true,
    ...(m.joined === true ? { joined: true } : {}),
  };
}

export const MAX_DURATION_MS = 24 * 60 * 60 * 1000;

function clampDuration(value: number): number {
  return Math.max(0, Math.min(num(value, 0), MAX_DURATION_MS));
}

/** A file's extras must not pose as a replay marker or a packet's field. */
function unknownFields(x: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(x)) {
    if (!PACKET_KNOWN_FIELDS.has(k)) out[k] = x[k];
  }
  return out;
}

/** TransportBar interpolates these into a title, and a value whose toString is
 *  not callable throws there during render. */
function decodeStatus(value: object): Partial<RobotStatus> {
  const s = value as Record<string, unknown>;
  const out: Partial<RobotStatus> = {};
  if (typeof s.activeOpMode === 'string') {
    out.activeOpMode = s.activeOpMode.slice(0, 200);
  }
  const known = Object.values(OpModeStatus) as unknown[];
  if (known.includes(s.activeOpModeStatus)) {
    out.activeOpModeStatus =
      s.activeOpModeStatus as RobotStatus['activeOpModeStatus'];
  }
  if (typeof s.batteryVoltage === 'number' && isFinite(s.batteryVoltage)) {
    out.batteryVoltage = s.batteryVoltage;
  }
  return out;
}

/** An index into `arr`, or null. Guards every dictionary dereference. */
function refIndex(value: unknown, length: number): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  if (value < 0 || value >= length) return null;
  return value;
}

/** Every slot has a crash behind it: a string dict-ref resolves against Array
 *  itself, a non-array log throws in tick, a non-string delta reaches React. */
function decodeFrame(
  f: unknown,
  keyCount: number,
  dictLength: number,
  xdictLength: number,
  setsLength: number,
): Frame | null {
  if (!Array.isArray(f)) return null;

  const t = f[0];
  if (typeof t !== 'number' || !Number.isFinite(t) || t < 0) return null;

  let delta: Record<string, string> | null = null;
  const rawDelta = f[1];
  if (
    typeof rawDelta === 'object' &&
    rawDelta !== null &&
    !Array.isArray(rawDelta)
  ) {
    for (const k of Object.keys(rawDelta as Record<string, unknown>)) {
      const idx = Number(k);
      if (!Number.isInteger(idx) || idx < 0 || idx >= keyCount) continue;

      const v = (rawDelta as Record<string, unknown>)[k];
      if (typeof v !== 'string') continue;

      if (delta === null) delta = {};
      delta[String(idx)] = v;
    }
  }

  const rawLog = f[2];
  const log = Array.isArray(rawLog)
    ? rawLog.filter((l): l is string => typeof l === 'string')
    : null;

  const out: Frame = [
    Math.min(t, MAX_DURATION_MS),
    delta,
    log,
    refIndex(f[3], dictLength),
    refIndex(f[4], dictLength),
  ];

  const flags = f[5];
  if (typeof flags === 'number' && Number.isFinite(flags)) {
    out[5] = flags & FLAG_CLEAR;
  }

  const extra = refIndex(f[6], xdictLength);
  const set = refIndex(f[7], setsLength);
  if (extra !== null || set !== null) {
    if (out[5] === undefined) out[5] = 0;
    out[6] = extra;
  }
  if (set !== null) out[7] = set;

  return out;
}

/** Every field is rebuilt rather than cast: this is the only boundary between a
 *  shared file and code that indexes arrays and spreads values into ops. */
export function decode(value: unknown): DecodedRecording | null {
  if (typeof value !== 'object' || value === null) return null;

  const rec = value as Partial<Recording>;
  const version: unknown = rec.v;
  if (version !== 2 && version !== RECORDING_VERSION) return null;
  if (!Array.isArray(rec.frames)) return null;
  if (!Array.isArray(rec.dict) || !Array.isArray(rec.keys)) return null;

  const id = typeof rec.id === 'string' ? rec.id : 'recording';
  const meta = decodeMeta(rec.meta, id);

  // .map, never .filter: frame deltas address these by position, so dropping a
  // bad entry relabels every key after it.
  const keys = rec.keys.map((k) => (typeof k === 'string' ? k : ''));
  const dict = rec.dict.map((ops) => (Array.isArray(ops) ? ops : []));
  const xdict = Array.isArray(rec.xdict)
    ? rec.xdict.map((x) =>
        typeof x === 'object' && x !== null && !Array.isArray(x)
          ? unknownFields(x)
          : {},
      )
    : [{}];
  const sets = Array.isArray(rec.sets)
    ? rec.sets.map((set) =>
        Array.isArray(set)
          ? set.filter((i) => refIndex(i, keys.length) !== null)
          : [],
      )
    : [];

  // Keyframes index frames by position: a dropped frame shifts every later one.
  const decodedFrames = rec.frames.map((f) =>
    decodeFrame(f, keys.length, dict.length, xdict.length, sets.length),
  );
  const droppedFrame = decodedFrames.some((f) => f === null);
  const keptFrames = decodedFrames.filter((f): f is Frame => f !== null);
  // Re-ordering invalidates kf.f as surely as dropping, and more quietly: the
  // indices stay in range while each names a different frame.
  const wasOrdered = keptFrames.every(
    (f, i) => i === 0 || keptFrames[i - 1][0] <= f[0],
  );
  // lastFrameAtOrBefore binary-searches this, so its order is load-bearing.
  const frames = wasOrdered
    ? keptFrames
    : [...keptFrames].sort((a, b) => a[0] - b[0]);

  const status = Array.isArray(rec.status)
    ? rec.status
        .filter(
          (s): s is StatusSample =>
            Array.isArray(s) &&
            typeof s[0] === 'number' &&
            Number.isFinite(s[0]) &&
            s[0] >= 0 &&
            typeof s[1] === 'object' &&
            s[1] !== null,
        )
        // Clamped like frames: recordedAnchor lines up a live run on these.
        .map(
          (s): StatusSample => [
            Math.min(s[0], MAX_DURATION_MS),
            decodeStatus(s[1]),
          ],
        )
        // Generous: at 1 Hz, the markers' cap of 500 would stop at 8m20s.
        .slice(0, MAX_STATUS_SAMPLES)
    : [];

  const markers = Array.isArray(rec.markers)
    ? rec.markers
        .filter(
          (m): m is Marker =>
            typeof m === 'object' &&
            m !== null &&
            typeof m.t === 'number' &&
            Number.isFinite(m.t) &&
            m.t >= 0,
        )
        .map((m) => ({
          t: Math.min(m.t, MAX_DURATION_MS),
          kind:
            m.kind === 'error' || m.kind === 'opmode' || m.kind === 'log'
              ? m.kind
              : ('log' as const),
          text: str(m.text, '').slice(0, 500),
        }))
        .slice(0, MAX_TIMELINE_ENTRIES)
    : [];

  // The stored duration is a hint; trust the tracks, which the transport bar
  // and end-of-playback check key off. Re-clamped, or the ruler loop hangs.
  let end = meta.durationMs;
  if (frames.length > 0) end = Math.max(end, frames[frames.length - 1][0]);
  if (status.length > 0) end = Math.max(end, status[status.length - 1][0]);
  for (const m of markers) end = Math.max(end, m.t);
  meta.durationMs = clampDuration(end);

  return {
    v: RECORDING_VERSION,
    id,
    meta,
    keys,
    dict,
    xdict,
    sets,
    frames,
    // Once a frame is dropped or moved every kf.f names the wrong frame, so the
    // index is rebuilt rather than discarded, which would make every seek O(n).
    index:
      droppedFrame || !wasOrdered
        ? buildIndex(keys, sets, frames)
        : decodeIndex(
            rec.index,
            frames.length,
            dict.length,
            xdict.length,
            sets,
          ),
    status,
    markers,
  };
}

function decodeIndex(
  raw: unknown,
  frameCount: number,
  dictLength: number,
  xdictLength: number,
  sets: number[][],
): Keyframe[] {
  return (
    (Array.isArray(raw) ? (raw as Keyframe[]) : [])
      .filter(
        (kf): kf is Keyframe =>
          typeof kf === 'object' &&
          kf !== null &&
          typeof kf.t === 'number' &&
          Number.isFinite(kf.t) &&
          typeof kf.data === 'object' &&
          kf.data !== null &&
          !Array.isArray(kf.data) &&
          Array.isArray(kf.log) &&
          // foldTo walks from kf.f with no lower bound, so a negative index
          // reaches applyFrame as undefined and throws from the scrub dispatch.
          refIndex(kf.f, frameCount) !== null &&
          refIndex(kf.o, dictLength) !== null &&
          refIndex(kf.fd, dictLength) !== null &&
          refIndex(kf.x, xdictLength) !== null &&
          (sets.length === 0 || refIndex(kf.k, sets.length) !== null) &&
          (kf.lo === undefined || refIndex(kf.lo, dictLength) !== null) &&
          (kf.lf === undefined || refIndex(kf.lf, dictLength) !== null),
      )
      .map((kf) => ({
        ...kf,
        data: Object.keys(kf.data).reduce<Record<string, string>>((acc, k) => {
          const v = kf.data[k];
          if (typeof v === 'string') acc[k] = v;
          return acc;
        }, {}),
        log: kf.log.filter((l): l is string => typeof l === 'string'),
      }))
      // keyframeFor binary-searches this, so its order is load-bearing.
      .sort((a, b) => a.f - b.f)
  );
}

/** The keyframes the encoder would have written for `frames`. */
function buildIndex(
  keys: string[],
  sets: number[][],
  frames: Frame[],
): Keyframe[] {
  const state = emptyFold(sets);
  const index: Keyframe[] = [];
  frames.forEach((f, i) => {
    applyFrame(keys, state, f);
    if ((i + 1) % KEYFRAME_INTERVAL !== 0) return;
    index.push({
      f: i,
      t: f[0],
      data: { ...state.data },
      log: [...state.log],
      o: state.o,
      fd: state.fd,
      x: state.x,
      ...(state.k === null ? {} : { k: state.k }),
      lo: state.lo,
      lf: state.lf,
    });
  });
  return index;
}

function emptyFold(sets: number[][]): FoldedState {
  return {
    data: {},
    log: [],
    logFresh: false,
    o: 0,
    fd: 0,
    x: 0,
    k: sets.length > 0 ? 0 : null,
    lo: 0,
    lf: 0,
    frameIdx: -1,
  };
}

function applyFrame(keys: string[], state: FoldedState, f: Frame) {
  if ((frameFlags(f) & FLAG_CLEAR) !== 0) {
    // FieldView's reduce is sticky and ignores empty batches, so a clear resets
    // telemetry text but leaves the last drawn overlay on the canvas.
    state.data = {};
    state.log = [];
    state.logFresh = false;
    return;
  }

  const delta = f[1];
  if (delta) {
    for (const idx of Object.keys(delta)) {
      const key = keys[Number(idx)];
      if (key === undefined) continue;
      state.data[key] = delta[idx];
    }
  }

  const log = f[2];
  state.logFresh = Boolean(log);
  if (log) state.log = log;

  if (f[3] !== null && f[3] !== undefined) state.o = f[3];
  if (f[4] !== null && f[4] !== undefined) state.fd = f[4];
  if (state.o !== 0) {
    state.lo = state.o;
    state.lf = state.fd;
  }

  const x = frameExtraRef(f);
  if (x !== null) state.x = x;

  const k = frameKeySetRef(f);
  if (k !== null && state.k !== null) state.k = k;
}

/** Index of the last frame with t <= tMs, or -1. */
function lastFrameAtOrBefore(frames: Frame[], tMs: number): number {
  let lo = 0;
  let hi = frames.length - 1;
  let found = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid][0] <= tMs) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return found;
}

/** Nearest keyframe at or before frame index `target`, or null. */
function keyframeFor(rec: DecodedRecording, target: number): Keyframe | null {
  let lo = 0;
  let hi = rec.index.length - 1;
  let found: Keyframe | null = null;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (rec.index[mid].f <= target) {
      found = rec.index[mid];
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return found;
}

/** State as of `tMs`. Starts from the nearest keyframe, so it walks at most
 *  KEYFRAME_INTERVAL frames however long the recording is. */
export function foldTo(rec: DecodedRecording, tMs: number): FoldedState {
  const target = lastFrameAtOrBefore(rec.frames, tMs);
  const state: FoldedState = { ...emptyFold(rec.sets), frameIdx: target };

  if (target < 0) return state;

  const kf = keyframeFor(rec, target);
  let start = 0;

  if (kf) {
    state.data = { ...kf.data };
    state.log = [...kf.log];
    state.o = kf.o;
    state.fd = kf.fd;
    state.x = kf.x;
    if (state.k !== null && kf.k !== undefined) state.k = kf.k;
    state.lo = kf.lo ?? kf.o;
    state.lf = kf.lf ?? kf.fd;
    // kf.f, not kf.f + 1: a keyframe does not record whether its own frame
    // carried a log. Re-applying is idempotent, every delta being a set.
    start = kf.f;
  }

  for (let i = start; i <= target; i++) {
    applyFrame(rec.keys, state, rec.frames[i]);
  }

  return state;
}

export function frameToPacket(
  rec: DecodedRecording,
  state: FoldedState,
  timestamp: number,
  /** `timestamp` cannot answer this: it is browser-epoch and scaled by playback
   *  speed, so a 4x replay would report the run as a quarter of its length. */
  recordedMs: number,
): TelemetryItem {
  const extra = rec.xdict[state.x] ?? {};

  return {
    ...extra,
    timestamp,
    recordedMs,
    data: carriedData(rec, state),
    log: state.logFresh ? [...state.log] : [],
    field: { ops: rec.dict[state.fd] ?? [] },
    fieldOverlay: { ops: rec.dict[state.o] ?? [] },
  } as TelemetryItem;
}

/** Everything on screen at `state`, as one packet for a seek to end on. */
export function seedPacket(
  rec: DecodedRecording,
  state: FoldedState,
  timestamp: number,
  recordedMs: number,
): TelemetryItem {
  return {
    ...(rec.xdict[state.x] ?? {}),
    timestamp,
    recordedMs,
    seed: true,
    data: { ...state.data },
    log: [...state.log],
    field: { ops: rec.dict[state.lf] ?? [] },
    fieldOverlay: { ops: rec.dict[state.lo] ?? [] },
  };
}

/** Only the keys the frame's packet carried: Graph and Logging treat every
 *  packet as a sample row. A recording without key sets gets the whole fold. */
function carriedData(
  rec: DecodedRecording,
  state: FoldedState,
): Record<string, string> {
  if (state.k === null) return { ...state.data };

  const data: Record<string, string> = {};
  for (const i of rec.sets[state.k] ?? []) {
    const key = rec.keys[i];
    if (key !== undefined && state.data[key] !== undefined) {
      data[key] = state.data[key];
    }
  }
  return data;
}

export function isClearFrame(f: Frame): boolean {
  return (frameFlags(f) & FLAG_CLEAR) !== 0;
}

/** One thing to dispatch. A clear is its own segment, or folding it into a
 *  neighbouring batch would lose it. */
export type ReplaySegment =
  | { kind: 'clear' }
  | { kind: 'batch'; packets: TelemetryItem[] };

/** Walks `state` over an INCLUSIVE range, in as few segments as possible. */
export function foldRange(
  rec: DecodedRecording,
  state: FoldedState,
  fromIdx: number,
  toIdx: number,
  timestampFor: (t: number) => number,
): ReplaySegment[] {
  const segments: ReplaySegment[] = [];
  let current: TelemetryItem[] = [];

  const flush = () => {
    if (current.length === 0) return;
    segments.push({ kind: 'batch', packets: current });
    current = [];
  };

  for (let i = fromIdx; i <= toIdx; i++) {
    const f = rec.frames[i];
    applyFrame(rec.keys, state, f);
    state.frameIdx = i;

    if (isClearFrame(f)) {
      flush();
      segments.push({ kind: 'clear' });
      continue;
    }

    current.push(frameToPacket(rec, state, timestampFor(f[0]), f[0]));
  }

  flush();
  return segments;
}

export function upgradeV1(
  legacy: unknown,
  id: string,
  name: string,
): Recording | null {
  if (!Array.isArray(legacy)) return null;

  // An array alone is not a recording, or any JSON array imports successfully
  // and lands in the library pinned, exempt from eviction.
  const looksLikeReplay = legacy.some(
    (e) =>
      typeof e === 'object' &&
      e !== null &&
      !Array.isArray(e) &&
      (Array.isArray((e as { ops?: unknown }).ops) ||
        Number.isFinite((e as { timestamp?: unknown }).timestamp as number)),
  );
  if (!looksLikeReplay) return null;

  const ops = new Interner<DrawOp[]>([]);
  const frames: Frame[] = [];
  const index: Keyframe[] = [];
  let lastT = 0;
  let overlayRef = 0;

  for (const entry of legacy) {
    if (typeof entry !== 'object' || entry === null) continue;

    const e = entry as { timestamp?: unknown; ops?: unknown };
    // Clamped like every other timestamp, since this path skips decodeMeta.
    const t =
      typeof e.timestamp === 'number' && Number.isFinite(e.timestamp)
        ? Math.max(0, Math.min(e.timestamp, MAX_DURATION_MS))
        : lastT;
    const entryOps = Array.isArray(e.ops) ? (e.ops as DrawOp[]) : [];

    lastT = Math.max(lastT, t);
    const ref = ops.intern(entryOps);
    frames.push([lastT, null, null, ref === overlayRef ? null : ref, null]);
    overlayRef = ref;

    if (frames.length % KEYFRAME_INTERVAL === 0) {
      index.push({
        f: frames.length - 1,
        t: lastT,
        data: {},
        log: [],
        o: overlayRef,
        fd: 0,
        x: 0,
      });
    }
  }

  return {
    v: RECORDING_VERSION,
    id,
    meta: {
      id,
      name,
      opMode: '',
      createdAt: Date.now(),
      robotT0: 0,
      durationMs: lastT,
      frameCount: frames.length,
      bytes: 0,
      channels: { telemetry: false, field: true },
      origin: 'recorded',
      pinned: true,
    },
    keys: [],
    dict: [...ops.values],
    xdict: [{}],
    sets: [],
    frames,
    index,
    status: [],
    markers: [],
  };
}

/** Same-origin relative paths only: Field.js assigns op.path straight to
 *  image.src. Normalized first, since the URL parser strips tab and newline. */
function safeImagePath(path: unknown): string | null {
  if (typeof path !== 'string') return null;

  const normalized = path.replace(/[\t\n\r]/g, '').trim();
  if (normalized === '') return null;
  if (normalized.includes('\\')) return null;

  try {
    const url = new URL(normalized, window.location.href);
    if (url.origin !== window.location.origin) return null;

    // Origin is not enough: `/.//attacker.example/x.gif` has THIS origin, yet
    // its path `//attacker.example/x.gif` is protocol-relative to image.src.
    const pathname = '/' + url.pathname.replace(/^\/+/, '');
    return pathname + url.search;
  } catch {
    return null;
  }
}

/** Checking `type` alone is not enough: `{type: 'polyline'}` reaches
 *  `fineMoveTo(xPoints[0], ...)` on undefined, with no error boundary. */
const OP_NUMBERS: { [type: string]: string[] } = {
  scale: ['scaleX', 'scaleY'],
  rotation: ['rotation'],
  translate: ['x', 'y'],
  strokeWidth: ['width'],
  circle: ['x', 'y', 'radius'],
  spline: [
    'ax',
    'bx',
    'cx',
    'dx',
    'ex',
    'fx',
    'ay',
    'by',
    'cy',
    'dy',
    'ey',
    'fy',
  ],
  image: ['x', 'y', 'theta', 'pivotX', 'pivotY', 'width', 'height'],
  text: ['x', 'y', 'theta'],
  grid: [
    'x',
    'y',
    'theta',
    'width',
    'height',
    'pivotX',
    'pivotY',
    'numTicksX',
    'numTicksY',
  ],
  alpha: ['alpha'],
};

/** Grid.java never sends these, but Field.js translates by them if present. */
const OP_OPTIONAL_NUMBERS: { [type: string]: string[] } = {
  grid: ['X', 'Y'],
};

const OP_STRINGS: { [type: string]: string[] } = {
  fill: ['color'],
  stroke: ['color'],
  text: ['font'],
};

/** Each becomes one absolutely positioned DOM node and an imported file may
 *  declare a million. Past a few hundred they overlap into a solid bar. */
const MAX_TIMELINE_ENTRIES = 500;
const OPMODE_MARKER_RESERVE = 100;

/** One per second of recording, and MAX_DURATION_MS is a day. */
const MAX_STATUS_SAMPLES = 100000;

/** Point arrays are walked index by index, so a huge length is a hang. */
const MAX_POINTS = 100000;

/** Laid out glyph by glyph on every repaint. Longer than any real label. */
const MAX_TEXT_LENGTH = 10000;

/** Bounds a loop that draws a line per tick; real grids are single digits. */
const MAX_TICKS = 1000;

/** Points one dict entry may cost a Field render, each allocating a matrix.
 *  A real overlay draws a few thousand at most. */
const MAX_DRAW_WORK = 50000;

/** Field.js requests each distinct image from the robot and keeps it. */
const MAX_IMAGE_PATHS = 16;

/** Field.js samples every spline at this many points. */
const SPLINE_WORK = 250;

function hasFiniteNumbers(op: object, fields: string[]): boolean {
  const rec = op as { [k: string]: unknown };
  return fields.every(
    (f) => typeof rec[f] === 'number' && Number.isFinite(rec[f] as number),
  );
}

function optionalNumbersFinite(op: object, fields: string[]): boolean {
  const rec = op as { [k: string]: unknown };
  return fields.every(
    (f) =>
      rec[f] === undefined ||
      (typeof rec[f] === 'number' && Number.isFinite(rec[f] as number)),
  );
}

function hasStrings(op: object, fields: string[]): boolean {
  const rec = op as { [k: string]: unknown };
  return fields.every((f) => typeof rec[f] === 'string');
}

function withinTickBudget(op: object): boolean {
  const rec = op as { numTicksX?: unknown; numTicksY?: unknown };
  return [rec.numTicksX, rec.numTicksY].every(
    (n) => typeof n === 'number' && n >= 0 && n <= MAX_TICKS,
  );
}

function finitePointArray(v: unknown): number[] | null {
  if (!Array.isArray(v)) return null;
  if (v.length === 0 || v.length > MAX_POINTS) return null;
  for (const n of v) {
    if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  }
  return v as number[];
}

function drawWork(op: DrawOp): number {
  switch (op.type) {
    case 'polygon':
    case 'polyline':
      return op.xPoints.length;
    case 'spline':
      return SPLINE_WORK;
    case 'grid':
      return op.numTicksX + op.numTicksY;
    case 'text':
      return op.text.length;
    default:
      return 1;
  }
}

function sanitizeOps(ops: DrawOp[], images: Set<string>): DrawOp[] {
  if (!Array.isArray(ops)) return [];

  const out: DrawOp[] = [];
  let work = 0;
  const push = (op: DrawOp) => {
    const cost = drawWork(op);
    if (work + cost > MAX_DRAW_WORK) return;
    work += cost;
    out.push(op);
  };
  for (const op of ops) {
    if (typeof op !== 'object' || op === null) continue;

    const type = (op as { type?: unknown }).type as string;
    if (!KNOWN_OP_TYPES.has(type)) continue;

    if (OP_NUMBERS[type] && !hasFiniteNumbers(op, OP_NUMBERS[type])) continue;
    if (
      OP_OPTIONAL_NUMBERS[type] &&
      !optionalNumbersFinite(op, OP_OPTIONAL_NUMBERS[type])
    ) {
      continue;
    }
    if (OP_STRINGS[type] && !hasStrings(op, OP_STRINGS[type])) continue;
    if (type === 'grid' && !withinTickBudget(op)) continue;
    // ctx.arc is specified to THROW on a negative radius, not ignore it, and it
    // throws in FieldView's update, which React turns into a blank dashboard.
    if (type === 'circle' && !((op as { radius: number }).radius >= 0))
      continue;

    if (type === 'polygon' || type === 'polyline') {
      const xPoints = finitePointArray(
        (op as unknown as { xPoints?: unknown }).xPoints,
      );
      const yPoints = finitePointArray(
        (op as unknown as { yPoints?: unknown }).yPoints,
      );
      if (!xPoints || !yPoints || xPoints.length !== yPoints.length) continue;

      push({ ...(op as object), xPoints, yPoints } as DrawOp);
      continue;
    }

    if ((op as { type: string }).type === 'image') {
      const path = safeImagePath((op as unknown as { path?: unknown }).path);
      if (path === null) continue;
      if (!images.has(path)) {
        if (images.size >= MAX_IMAGE_PATHS) continue;
        images.add(path);
      }
      push({ ...(op as object), path } as DrawOp);
      continue;
    }

    if ((op as { type: string }).type === 'text') {
      const text = (op as unknown as { text?: unknown }).text;
      push({
        ...(op as object),
        // Laid out glyph by glyph on every repaint, so a huge string is a hang.
        text: typeof text === 'string' ? text.slice(0, MAX_TEXT_LENGTH) : '',
      } as DrawOp);
      continue;
    }

    push(op);
  }

  return out;
}

/** Does NOT HTML-escape telemetry text, deliberately: React escapes at render.
 *  What needs hardening is what it misses: throwing ops and image paths. */
export function sanitizeImported(rec: Recording): Recording {
  const images = new Set<string>();
  return {
    ...rec,
    meta: {
      ...rec.meta,
      name: String(rec.meta?.name ?? 'Imported recording').slice(0, 200),
      opMode: String(rec.meta?.opMode ?? '').slice(0, 200),
      origin: 'imported',
    },
    dict: rec.dict.map((ops) => sanitizeOps(ops, images)),
    markers: rec.markers.map((m) => ({
      ...m,
      text: String(m.text ?? '').slice(0, 500),
    })),
  };
}
