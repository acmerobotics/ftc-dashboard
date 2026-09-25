import {
  decode,
  joinChunks,
  Recording,
  RECORDING_CAP,
  RecordingChunk,
  RecordingMeta,
  sanitizeImported,
  upgradeV1,
  wholeChunk,
} from './format';
import { formatBytes } from './timeFormat';

const DB_NAME = 'ftc-dashboard';
const DB_VERSION = 3;
const STORE_META = 'meta';
const STORE_CHUNKS = 'chunks';
/** Which tab has which recording open. Web Locks would do, but need a secure
 *  context and a robot serves the dashboard over plain http. */
const STORE_LEASES = 'leases';
/** Version 1 kept each recording whole in one row, rewritten on every flush. */
const STORE_V1_RECORDINGS = 'recordings';

/** The pre-v2 recorder's prefix. Its entries are read, never rewritten. */
export const LEGACY_PREFIX = 'field_replay_';

const UNAVAILABLE = 'Browser storage is unavailable.';
export const GONE = 'it is no longer in browser storage';

/** Unpinned auto-captures kept before the oldest is evicted. */
export const AUTO_KEEP_COUNT = 10;

export type RecordingSource = 'idb' | 'legacy';

export type RecordingListEntry = {
  meta: RecordingMeta;
  source: RecordingSource;
};

/** `chunks` is written with each chunk in one transaction, so it always names
 *  exactly the rows a reader should join. */
type StoredMeta = RecordingMeta & { chunks: number };
/** The chunk as JSON in `data`, or inline where Blobs cannot be stored. */
type ChunkRow = Partial<RecordingChunk> & {
  recordingId: string;
  seq: number;
  data?: Blob;
};

function keysOf(id: string): IDBKeyRange {
  // [id] sorts before every [id, x]; an array after every number and string.
  return IDBKeyRange.bound([id], [id, []]);
}

function toMeta(stored: StoredMeta): RecordingMeta {
  const meta: Partial<StoredMeta> = { ...stored };
  delete meta.chunks;
  return meta as RecordingMeta;
}

/** Runs inside the upgrade transaction, so a crash part way leaves version 1
 *  and every row where it was. */
function migrateV1(db: IDBDatabase, upgrade: IDBTransaction) {
  const metas = upgrade.objectStore(STORE_META);
  const chunks = upgrade.objectStore(STORE_CHUNKS);
  const cursor = upgrade.objectStore(STORE_V1_RECORDINGS).openCursor();

  cursor.onsuccess = () => {
    const c = cursor.result;
    if (!c) {
      db.deleteObjectStore(STORE_V1_RECORDINGS);
      return;
    }

    const rec = c.value as Recording;
    const id = String(c.primaryKey);
    chunks.put({ ...wholeChunk(rec), recordingId: id, seq: 0 });

    const get = metas.get(id);
    get.onsuccess = () => {
      // The meta row, not rec.meta: renames and pins were read from there.
      const meta = (get.result ?? rec.meta ?? {}) as RecordingMeta;
      metas.put({ ...meta, id, chunks: 1 });
    };
    c.continue();
  };
}

let dbPromise: Promise<IDBDatabase> | null = null;
let currentDb: IDBDatabase | null = null;
/** Why the database did not open, until the next attempt. */
let idbProblem: 'failed' | 'newer' | 'full' | 'blocked' | null = null;
let lastOpenAt = 0;
const REOPEN_AFTER_MS = 5000;
/** Whether this browser can store a chunk as a Blob; see canStoreBlobs. */
let blobRows = true;
/** Lets the recorder tell a delete made here from storage being cleared. */
const removedHere = new Set<string>();
/** Written once this tab has changed the library, so other tabs list it. */
export const LIBRARY_CHANGED_KEY = 'recorderLibraryChanged';
/** Written as a tab takes, gives up or asks to renew the recorder lease. */
export const RECORDER_LEASE_KEY = 'recorderLease';
let announced = 0;

function hasIndexedDb(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

export function isIndexedDbAvailable(): boolean {
  return hasIndexedDb() && idbProblem === null;
}

/** Why recordings cannot be stored here, as the Recorder puts it. */
export function storageWarning(): string | null {
  if (hasIndexedDb() && idbProblem === 'newer') {
    return (
      'A newer version of the dashboard has stored recordings in this ' +
      'browser, so this one cannot open them or save new runs. Update the ' +
      'dashboard on this robot to use them.'
    );
  }
  if (hasIndexedDb() && idbProblem === 'full') {
    return (
      'Browser storage is full, so recordings from an earlier version of ' +
      'the dashboard cannot be upgraded and new runs cannot be saved. Free ' +
      'up disk space, then reload.'
    );
  }
  if (hasIndexedDb() && idbProblem === 'blocked') {
    return (
      'Another tab is using an older version of the dashboard, so new runs ' +
      'cannot be saved until that tab is closed or reloaded.'
    );
  }
  if (isIndexedDbAvailable()) return null;
  return (
    'This browser will not let the dashboard store recordings, so new runs ' +
    'cannot be saved.'
  );
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }

    lastOpenAt = Date.now();
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    // The open request reports only that the upgrade aborted, not why.
    let upgradeError: DOMException | null = null;

    req.onupgradeneeded = () => {
      const db = req.result;
      const upgrade = req.transaction;
      if (upgrade) {
        upgrade.onabort = () => {
          upgradeError = upgrade.error;
        };
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CHUNKS)) {
        db.createObjectStore(STORE_CHUNKS, { keyPath: ['recordingId', 'seq'] });
      }
      if (!db.objectStoreNames.contains(STORE_LEASES)) {
        db.createObjectStore(STORE_LEASES, { keyPath: ['recordingId', 'tab'] });
      }
      if (db.objectStoreNames.contains(STORE_V1_RECORDINGS) && upgrade) {
        migrateV1(db, upgrade);
      }
    };

    req.onsuccess = () => {
      idbProblem = null;
      const db = req.result;
      // A tab wanting a newer schema blocks forever on a connection that never
      // closes; standing aside costs only the reconnect the next call performs.
      db.onversionchange = () => {
        db.close();
        forget(db);
      };
      // Fired when the browser closes it: site data cleared, or storage broken.
      db.onclose = () => forget(db);
      currentDb = db;
      void canStoreBlobs(db).then((ok) => {
        blobRows = ok;
        resolve(db);
      });
    };
    req.onerror = () =>
      reject(upgradeError ?? req.error ?? new Error('IndexedDB open failed'));
    // Left pending: the upgrade runs once the older tab lets go.
    req.onblocked = () => {
      idbProblem = 'blocked';
    };
  });

  dbPromise = dbPromise.catch((err) => {
    // VersionError: a newer dashboard on the same robot address upgraded it.
    if (err instanceof DOMException && err.name === 'VersionError') {
      idbProblem = 'newer';
    } else {
      idbProblem = isQuotaExceeded(err) ? 'full' : 'failed';
    }
    dbPromise = null;
    throw err;
  });

  return dbPromise;
}

/** WebKit cannot store a Blob in some modes and says so only by failing the
 *  transaction, so a probe is written and removed before any chunk is. */
function canStoreBlobs(db: IDBDatabase): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const probe = db.transaction([STORE_LEASES], 'readwrite');
      const leases = probe.objectStore(STORE_LEASES);
      leases.put({
        recordingId: '',
        tab: tabId,
        until: 0,
        probe: new Blob(['probe']),
      });
      leases.delete(['', tabId]);
      probe.oncomplete = () => resolve(true);
      probe.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/** Chrome compresses a large row and keeps it in a file, freed as soon as it
 *  is deleted, but a small row only when LevelDB compacts, so deleting small
 *  ones at the quota frees nothing. A Blob is always a file, uncompressed. */
const BLOB_BELOW_BYTES = 512 * 1024;

function packChunk(
  chunk: RecordingChunk,
  bytes: number,
): Blob | RecordingChunk {
  return blobRows && bytes < BLOB_BELOW_BYTES
    ? new Blob([JSON.stringify(chunk)])
    : chunk;
}

function chunkRow(
  recordingId: string,
  seq: number,
  packed: Blob | RecordingChunk,
): ChunkRow {
  return packed instanceof Blob
    ? { recordingId, seq, data: packed }
    : { ...packed, recordingId, seq };
}

async function unpackChunk(row: ChunkRow): Promise<Partial<RecordingChunk>> {
  return row.data instanceof Blob ? JSON.parse(await row.data.text()) : row;
}

function announce(key = LIBRARY_CHANGED_KEY) {
  try {
    window.localStorage.setItem(key, `${tabId} ${++announced}`);
  } catch {
    // Other tabs then catch up when they next read the library or the lease.
  }
}

export function noteLibraryChanged() {
  announce();
}

function forget(db: IDBDatabase) {
  if (currentDb !== db) return;
  currentDb = null;
  dbPromise = null;
}

function tx<T>(
  storeNames: string[],
  mode: IDBTransactionMode,
  run: (stores: IDBObjectStore[]) => IDBRequest<T> | null,
): Promise<T | null> {
  return openDb()
    .then((db) => runTx(db, storeNames, mode, run))
    .catch(async (err) => {
      // A closed connection throws this from every call until it is replaced.
      if (!(err instanceof DOMException && err.name === 'InvalidStateError')) {
        throw err;
      }
      if (currentDb) forget(currentDb);
      return runTx(await openDb(), storeNames, mode, run);
    });
}

function runTx<T>(
  db: IDBDatabase,
  storeNames: string[],
  mode: IDBTransactionMode,
  run: (stores: IDBObjectStore[]) => IDBRequest<T> | null,
): Promise<T | null> {
  return new Promise<T | null>((resolve, reject) => {
    const transaction = db.transaction(storeNames, mode);
    const stores = storeNames.map((n) => transaction.objectStore(n));

    let request: IDBRequest<T> | null = null;
    try {
      request = run(stores);
    } catch (err) {
      reject(err);
      return;
    }

    transaction.oncomplete = () =>
      resolve(request ? (request.result as T) : null);
    // The request's own error: transaction.error is only set once it aborts.
    transaction.onerror = (event) =>
      reject(
        (event.target as IDBRequest | null)?.error ??
          transaction.error ??
          new Error('IndexedDB transaction failed'),
      );
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

function legacyKeys(): string[] {
  try {
    return Object.keys(window.localStorage).filter((k) =>
      k.startsWith(LEGACY_PREFIX),
    );
  } catch {
    return [];
  }
}

function legacyMeta(key: string): RecordingMeta {
  let bytes = 0;
  try {
    bytes = window.localStorage.getItem(key)?.length ?? 0;
  } catch {
    bytes = 0;
  }

  return {
    id: key,
    name: key.replace(LEGACY_PREFIX, ''),
    opMode: '',
    createdAt: 0,
    robotT0: 0,
    durationMs: 0,
    frameCount: 0,
    bytes,
    channels: { telemetry: false, field: true },
    origin: 'recorded',
    pinned: true,
  };
}

export function isLegacyId(id: string): boolean {
  return id.startsWith(LEGACY_PREFIX);
}

export async function list(): Promise<RecordingListEntry[]> {
  // Cleared so this call retries; a failure below sets it again.
  if (idbProblem && dbPromise === null && hasIndexedDb()) idbProblem = null;

  const legacy: RecordingListEntry[] = legacyKeys().map((k) => ({
    meta: legacyMeta(k),
    source: 'legacy' as const,
  }));

  let stored: RecordingListEntry[] = [];
  if (isIndexedDbAvailable()) {
    try {
      const metas = await tx<StoredMeta[]>([STORE_META], 'readonly', ([s]) =>
        s.getAll(),
      );
      stored = (metas ?? []).map((m) => ({
        meta: toMeta(m),
        source: 'idb' as const,
      }));
    } catch (err) {
      // A database that will not open is what the unavailable warning is for; a
      // read that fails must not pass for an empty library.
      if (isIndexedDbAvailable()) throw err;
    }
  }

  return [...stored, ...legacy].sort(
    (a, b) => b.meta.createdAt - a.meta.createdAt,
  );
}

/** Null only when the recording is gone; a read that fails throws. */
export async function load(id: string): Promise<Recording | null> {
  if (isLegacyId(id)) {
    const raw = window.localStorage.getItem(id);
    if (!raw) return null;
    let upgraded: Recording | null = null;
    try {
      upgraded = upgradeV1(JSON.parse(raw), id, id.replace(LEGACY_PREFIX, ''));
    } catch {
      upgraded = null;
    }
    if (!upgraded)
      throw new Error('it is not a recording this dashboard reads');
    // Sanitized on the way out, as importFile does: an older dashboard wrote
    // these unbounded, a route for an off-origin image path to the canvas.
    return sanitizeImported(upgraded);
  }

  if (!isIndexedDbAvailable()) throw new Error(UNAVAILABLE);

  const read: { meta?: StoredMeta; rows: ChunkRow[] } = { rows: [] };
  await tx([STORE_META, STORE_CHUNKS], 'readonly', ([metas, chunks]) => {
    const m = metas.get(id);
    m.onsuccess = () => {
      read.meta = m.result;
    };
    const c = chunks.getAll(keysOf(id));
    c.onsuccess = () => {
      read.rows = c.result;
    };
    return null;
  });
  if (!read.meta) return null;

  const count = read.meta.chunks ?? 0;
  const joined: ChunkRow[] = [];
  for (const row of [...read.rows].sort((a, b) => a.seq - b.seq)) {
    if (row.seq !== joined.length || row.seq >= count) break;
    joined.push(row);
  }
  const chunks = await Promise.all(joined.map(unpackChunk));
  return decode(joinChunks(id, toMeta(read.meta), chunks));
}

export type AppendResult = 'saved' | 'missing';

/** One transaction, read and write: a rename or delete landing between separate
 *  read and write would be undone, or the deleted row resurrected. */
export async function appendChunk(
  meta: RecordingMeta,
  chunk: RecordingChunk,
  opts: {
    /** A row gone after a successful save was deleted, so is not recreated. */
    mustExist: boolean;
    /** The name the recorder last wrote; any other stored name is a rename. */
    ownName: string;
    /** The chunk's encoded size, as the encoder estimates it. */
    bytes: number;
  },
): Promise<AppendResult> {
  if (!isIndexedDbAvailable()) throw new Error(UNAVAILABLE);

  await openDb();
  const packed = packChunk(chunk, opts.bytes);
  let result: AppendResult = 'saved';
  await tx([STORE_META, STORE_CHUNKS], 'readwrite', ([metas, chunks]) => {
    result = 'saved';
    const get = metas.get(meta.id);
    get.onsuccess = () => {
      const stored = get.result as StoredMeta | undefined;
      if (!stored && opts.mustExist) {
        result = 'missing';
        return;
      }

      const seq = stored?.chunks ?? 0;
      chunks.put(chunkRow(meta.id, seq, packed));
      metas.put({
        ...meta,
        name: stored && stored.name !== opts.ownName ? stored.name : meta.name,
        pinned: stored?.pinned ?? meta.pinned,
        chunks: seq + 1,
      });
    };
    return null;
  });
  return result;
}

async function saveWhole(rec: Recording, bytes: number): Promise<void> {
  if (!isIndexedDbAvailable()) throw new Error(UNAVAILABLE);

  await openDb();
  const packed = packChunk(wholeChunk(rec), bytes);
  await tx([STORE_META, STORE_CHUNKS], 'readwrite', ([metas, chunks]) => {
    chunks.put(chunkRow(rec.id, 0, packed));
    metas.put({ ...rec.meta, chunks: 1 });
    return null;
  });
}

export async function remove(id: string): Promise<void> {
  if (isLegacyId(id)) {
    try {
      window.localStorage.removeItem(id);
    } catch {
      // Nothing useful to do; the caller re-lists either way.
    }
    announce();
    return;
  }

  if (!isIndexedDbAvailable()) throw new Error(UNAVAILABLE);

  removedHere.add(id);
  await tx(
    [STORE_META, STORE_CHUNKS, STORE_LEASES],
    'readwrite',
    ([metas, chunks, leases]) => {
      metas.delete(id);
      chunks.delete(keysOf(id));
      leases.delete(keysOf(id));
      return null;
    },
  );
  announce();
}

export async function updateMeta(
  id: string,
  patch: Partial<RecordingMeta>,
): Promise<void> {
  if (isLegacyId(id)) return;
  if (!isIndexedDbAvailable()) throw new Error(UNAVAILABLE);

  let missing = false;
  await tx([STORE_META], 'readwrite', ([metas]) => {
    const get = metas.get(id);
    get.onsuccess = () => {
      const stored = get.result as StoredMeta | undefined;
      missing = !stored;
      if (stored) metas.put({ ...stored, ...patch, id, chunks: stored.chunks });
    };
    return null;
  });
  if (missing) throw new Error(GONE);
  announce();
}

export function wasRemovedHere(id: string): boolean {
  return removedHere.has(id);
}

export function isQuotaExceeded(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'QuotaExceededError';
}

/** Chrome's QuotaExceededError carries an empty message. */
export function describeStorageError(err: unknown): string {
  if (isQuotaExceeded(err)) {
    return 'browser storage is full. Delete recordings to make room.';
  }
  if (err instanceof Error) return err.message || err.name;
  return String(err);
}

type Lease = { recordingId: string; tab: string; until: number };

/** Outlasts the minute a hidden tab's timers can stall between renewals. */
const LEASE_TTL_MS = 3 * 60 * 1000;
const LEASE_RENEW_MS = 30 * 1000;

/** Recording id to what holds it open here: the recorder, a review, or both. */
const held = new Map<string, Set<string>>();
let leaseTimer: ReturnType<typeof setInterval> | null = null;

function writeLeases(ids: string[]) {
  if (ids.length === 0 || !isIndexedDbAvailable()) return;
  const until = Date.now() + LEASE_TTL_MS;
  void tx([STORE_LEASES], 'readwrite', ([leases]) => {
    for (const recordingId of ids)
      leases.put({ recordingId, tab: tabId, until });
    return null;
  }).catch(() => undefined);
}

/** No tab's eviction deletes a recording while any tab holds it open. */
export function holdOpen(id: string, holder: string) {
  if (isLegacyId(id)) return;
  const holders = held.get(id) ?? new Set<string>();
  holders.add(holder);
  held.set(id, holders);
  if (holders.size === 1) writeLeases([id]);
  if (leaseTimer === null) {
    leaseTimer = setInterval(
      () => writeLeases([...held.keys()]),
      LEASE_RENEW_MS,
    );
  }
}

export function releaseOpen(id: string, holder: string) {
  const holders = held.get(id);
  if (!holders?.delete(holder) || holders.size > 0) return;

  held.delete(id);
  if (held.size === 0 && leaseTimer !== null) {
    clearInterval(leaseTimer);
    leaseTimer = null;
  }
  if (!isIndexedDbAvailable()) return;
  void tx([STORE_LEASES], 'readwrite', ([leases]) => {
    leases.delete([id, tabId]);
    return null;
  }).catch(() => undefined);
}

/** Which tab records op modes automatically, so a run is saved once. A row in
 *  STORE_LEASES: only a transaction can compare and set across tabs. */
const RECORDER_KEY = ['', 'recorder'];
/** The holder renews about every second, by timer or as telemetry arrives. */
export const RECORDER_STALE_MS = 5000;
/** How long a stale lease is left to a tab whose backlog of telemetry covers
 *  what its holder may not have saved, before a tab whose backlog does not. */
const RECORDER_GRACE_MS = 2000;

export type RecorderLease = {
  holder: string;
  until: number;
  visible: boolean;
  recording: boolean;
  opMode: string;
  /** Up to when the holder has saved what it recorded. */
  savedTo: number;
};

/** As this tab last read it, for the recorder to consult on every batch. */
let recorder: RecorderLease | null = null;
/** A stale lease is taken if its holder, asked to renew it, has not a second
 *  later: a clock jump stales every lease, and events wake a hidden holder. */
let staleSeen = { id: '', at: 0 };
const RECORDER_PROBE_MS = 1000;
let askedToEnd = '';

export function holdsRecorder(): boolean {
  return recorder?.holder === tabId && recorder.until > Date.now();
}

export function recorderHeldElsewhere(): boolean {
  return recorder !== null && recorder.holder !== tabId;
}

export function holderSavedTo(): number | null {
  return recorder !== null && recorder.holder !== tabId
    ? recorder.savedTo
    : null;
}

function leaseNote(): string | null {
  try {
    return window.localStorage.getItem(RECORDER_LEASE_KEY);
  } catch {
    return null;
  }
}

/** Takes the lease if free, stale or this tab's, or from a hidden tab between
 *  runs if visible. Resolves to a lease taken from a tab stalled mid-run. */
export async function claimRecorder(
  state: Omit<RecorderLease, 'holder' | 'until'>,
  bufferedSince: number | null,
  running?: string | null,
): Promise<RecorderLease | null> {
  if (!isIndexedDbAvailable()) return null;
  const was = recorder?.holder;
  const mine = (): RecorderLease => ({
    ...state,
    holder: tabId,
    until: Date.now() + RECORDER_STALE_MS,
  });
  let seen = null as RecorderLease | null;
  let orphan = null as RecorderLease | null;
  let probe = false;
  const note = leaseNote();
  try {
    await tx([STORE_LEASES], 'readwrite', ([leases]) => {
      const get = leases.get(RECORDER_KEY);
      get.onsuccess = () => {
        const held = get.result as RecorderLease | undefined;
        const now = Date.now();
        const id = `${held?.holder} ${held?.until}`;
        const released = note === `released ${id}`;
        // Released, it counts as stale since the holder last renewed it.
        const until = released
          ? (held?.until ?? 0) - RECORDER_STALE_MS
          : held?.until ?? 0;
        const probed =
          staleSeen.id === id && now - staleSeen.at >= RECORDER_PROBE_MS;
        const kept =
          held !== undefined &&
          held.holder !== tabId &&
          (until > now
            ? !state.visible || held.visible || held.recording
            : (!released && !probed) ||
              ((bufferedSince ?? now) > held.savedTo &&
                now < until + RECORDER_GRACE_MS));
        if (!kept || until > now) {
          staleSeen = { id: '', at: 0 };
        } else if (staleSeen.id !== id) {
          staleSeen = { id, at: now };
          probe = !released;
        }
        // A hidden holder's status poll can stall past the end of its run.
        // Its own visibility: a tab that cannot save claims as a hidden one.
        if (
          kept &&
          until > now &&
          document.visibilityState === 'visible' &&
          !held.visible &&
          held.recording &&
          held.opMode !== '' &&
          running !== undefined &&
          running !== held.opMode &&
          askedToEnd !== id
        ) {
          askedToEnd = id;
          probe = true;
        }
        seen = kept ? held : mine();
        if (kept) return;
        orphan = held?.holder !== tabId && held?.recording ? held : null;
        leases.put({
          recordingId: RECORDER_KEY[0],
          tab: RECORDER_KEY[1],
          ...seen,
        });
      };
      return null;
    });
  } catch {
    // A lease that cannot be written, as at the quota, must not stop recording.
    const held = recorder;
    seen =
      held && held.holder !== tabId && held.until > Date.now() ? held : mine();
  }
  recorder = seen;
  if (probe || (seen?.holder === tabId && was !== tabId)) {
    announce(RECORDER_LEASE_KEY);
  }
  return orphan;
}

/** Lets another tab take over at once, as this one closes or stops recording.
 *  Noted in localStorage: a page going away cannot count on a transaction. */
export function releaseRecorder() {
  const held = recorder;
  if (held?.holder !== tabId) return;
  recorder = null;
  try {
    window.localStorage.setItem(
      RECORDER_LEASE_KEY,
      `released ${tabId} ${held.until}`,
    );
  } catch {
    // Then it goes stale on its own.
  }
}

/** Deletes, in one transaction, the automatic recordings `pick` chooses from
 *  those no tab has open, oldest first. Expired open leases go with them. */
async function evictWhere(
  pick: (oldestFirst: StoredMeta[]) => StoredMeta[],
): Promise<string[]> {
  if (!isIndexedDbAvailable()) return [];

  const doomed: string[] = [];
  await tx(
    [STORE_META, STORE_CHUNKS, STORE_LEASES],
    'readwrite',
    ([metas, chunks, leases]) => {
      doomed.length = 0;
      const all = metas.getAll();
      const open = leases.getAll();
      open.onsuccess = () => {
        const now = Date.now();
        const leased = new Set<string>();
        for (const l of open.result as Lease[]) {
          if (l.until > now) leased.add(l.recordingId);
          else if (l.tab !== RECORDER_KEY[1]) {
            leases.delete([l.recordingId, l.tab]);
          }
        }

        const eligible = (all.result as StoredMeta[])
          .filter((m) => !m.pinned && !held.has(m.id) && !leased.has(m.id))
          .sort((a, b) => a.createdAt - b.createdAt);
        for (const m of pick(eligible)) {
          metas.delete(m.id);
          chunks.delete(keysOf(m.id));
          doomed.push(m.id);
        }
      };
      return null;
    },
  );
  if (doomed.length > 0) announce();
  return doomed;
}

export function evictAuto(keep = AUTO_KEEP_COUNT): Promise<string[]> {
  return evictWhere((oldestFirst) =>
    oldestFirst.slice(0, Math.max(0, oldestFirst.length - keep)),
  );
}

/** Oldest first, until what they held covers `bytes`. */
export function evictForSpace(bytes: number): Promise<string[]> {
  return evictWhere((oldestFirst) => {
    const out: StoredMeta[] = [];
    let freed = 0;
    for (const m of oldestFirst) {
      if (freed >= bytes) break;
      out.push(m);
      freed += m.bytes;
    }
    return out;
  });
}

/** Null where StorageManager is missing: it is only in secure contexts, and a
 *  robot serves the dashboard over plain http. */
export async function usage(): Promise<{
  usage: number;
  quota: number;
} | null> {
  try {
    const estimate = await navigator.storage?.estimate?.();
    if (estimate?.quota) {
      return { usage: estimate.usage ?? 0, quota: estimate.quota };
    }
  } catch {
    // Reported as missing, and the library's own total shown instead.
  }
  return null;
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  // Revoking synchronously can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function exportFile(id: string): Promise<void> {
  if (isLegacyId(id)) {
    // Legacy files download byte-identically to how they were saved.
    const raw = window.localStorage.getItem(id);
    if (!raw) throw new Error(GONE);
    download(`${id}.json`, raw);
    return;
  }

  const rec = await load(id);
  if (!rec) throw new Error(GONE);

  // Download first: pinning is the one write that can reject at quota, which is
  // exactly when a user exports in order to free space.
  download(`${rec.meta.name || id}.json`, JSON.stringify(rec));
  try {
    await updateMeta(id, { pinned: true });
  } catch {
    // Exported is what matters; the pin is best effort.
  }
}

/** Over what the recorder writes. Parsing takes several times this memory. */
const MAX_IMPORT_BYTES = 1.5 * RECORDING_CAP.bytes;

export async function importFile(file: File): Promise<Recording> {
  if (file.size > MAX_IMPORT_BYTES) {
    throw new Error(
      `it is ${formatBytes(file.size)}, over the ` +
        `${formatBytes(MAX_IMPORT_BYTES)} a recording can be`,
    );
  }
  const text = await file.text();
  const parsed: unknown = JSON.parse(text);
  const baseName = file.name.replace(/\.json$/i, '');
  const id = newRecordingId();

  // v1 files are a bare array of {timestamp, ops}.
  if (Array.isArray(parsed)) {
    const upgraded = upgradeV1(parsed, id, baseName);
    if (!upgraded) throw new Error('Not a recognizable recording');

    const rec = sanitizeImported(upgraded);
    await saveWhole(rec, file.size);
    return rec;
  }

  const decoded = decode(parsed);
  if (!decoded) throw new Error('Not a recognizable recording');

  const rec = sanitizeImported({
    ...decoded,
    id,
    meta: {
      ...decoded.meta,
      id,
      name: decoded.meta.name || baseName || 'Imported recording',
      pinned: true,
    },
  });

  await saveWhole(rec, file.size);
  return rec;
}

/** Tries a database that failed to open again, at most every few seconds. */
export function retryStorage() {
  if (idbProblem !== 'failed' || dbPromise !== null) return;
  if (Date.now() - lastOpenAt < REOPEN_AFTER_MS) return;
  void openDb().catch(() => undefined);
}

let idCounter = 0;

/** idCounter is per-tab module state, so two dashboards on one robot both start
 *  at 1 and arm off the same status poll, landing in the same millisecond. */
const tabId = Math.random().toString(36).slice(2, 8);

export function newRecordingId(): string {
  idCounter += 1;
  // The counter is load-bearing: this tab can mint two ids in one millisecond.
  return `rec_${Date.now()}_${tabId}_${idCounter}`;
}
