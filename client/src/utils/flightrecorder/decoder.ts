/*
  Flight Recorder log decoder (client-side)
  Matches DashboardCore LogWriter/LogReader format:
  - Header: 2 bytes magic 'RR' + 2 bytes version (short) == 1
  - Entries:
    - int32 entryType: 0 = schema, 1 = message
    - Schema entry:
        int32 nameLen, bytes name (UTF-8), schema (see tags)
    - Message entry:
        int32 channelIndex, object encoded per schema
  - Schema tags (int32):
      0: struct { int32 fieldCount; repeat: int32 nameLen; bytes name; schema }
      1: int32
      2: int64
      3: double (IEEE-754 64-bit)
      4: string { int32 len; bytes }
      5: boolean (1 byte, 0/1)
      6: enum dynamic { int32 count; repeat: int32 nameLen; bytes name }
      7: array { element schema }
*/

export type SchemaTag = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type EntrySchema =
  | { tag: 1 }
  | { tag: 2 }
  | { tag: 3 }
  | { tag: 4 }
  | { tag: 5 }
  | { tag: 6; constants: string[] }
  | { tag: 7; element: EntrySchema }
  | { tag: 0; fields: Record<string, EntrySchema> };

export type ChannelInfo = {
  name: string;
  schema: EntrySchema;
};

export type LogSchemaEntry = {
  type: 'schema';
  channelName: string;
  schema: EntrySchema;
};

export type LogMessageEntry = {
  type: 'message';
  channelIndex: number;
  channelName: string;
  data: any;
};

export type LogEntry = LogSchemaEntry | LogMessageEntry;

export type DecodedLog = {
  version: number;
  channels: ChannelInfo[];
  entries: LogEntry[];
};

class Reader {
  private view: DataView;
  private off = 0;
  private decoder = new TextDecoder('utf-8');

  constructor(private buf: ArrayBuffer) {
    this.view = new DataView(buf);
  }

  get eof(): boolean {
    return this.off >= this.view.byteLength;
  }

  ensure(n: number) {
    if (this.off + n > this.view.byteLength) {
      throw new Error('Unexpected EOF while reading log');
    }
  }

  u8(): number {
    this.ensure(1);
    const v = this.view.getUint8(this.off);
    this.off += 1;
    return v;
  }

  i32(): number {
    this.ensure(4);
    const v = this.view.getInt32(this.off, false);
    this.off += 4;
    return v;
  }

  i16(): number {
    this.ensure(2);
    const v = this.view.getInt16(this.off, false);
    this.off += 2;
    return v;
  }

  i64(): bigint {
    this.ensure(8);
    const v = this.view.getBigInt64(this.off, false);
    this.off += 8;
    return v;
  }

  f64(): number {
    this.ensure(8);
    const v = this.view.getFloat64(this.off, false);
    this.off += 8;
    return v;
  }

  str(): string {
    const len = this.i32();
    this.ensure(len);
    const bytes = new Uint8Array(this.buf, this.off, len);
    this.off += len;
    return this.decoder.decode(bytes);
  }
}

function readSchema(r: Reader): EntrySchema {
  const tag = r.i32() as SchemaTag;
  switch (tag) {
    case 1:
      return { tag };
    case 2:
      return { tag };
    case 3:
      return { tag };
    case 4:
      return { tag };
    case 5:
      return { tag };
    case 6: {
      const count = r.i32();
      const constants: string[] = [];
      for (let i = 0; i < count; i++) {
        constants.push(r.str());
      }
      return { tag, constants };
    }
    case 7: {
      const element = readSchema(r);
      return { tag, element };
    }
    case 0: {
      const fieldCount = r.i32();
      const fields: Record<string, EntrySchema> = {};
      for (let i = 0; i < fieldCount; i++) {
        const fname = r.str();
        const fschema = readSchema(r);
        fields[fname] = fschema;
      }
      return { tag, fields };
    }
    default:
      throw new Error(`Unknown schema tag: ${tag}`);
  }
}

function readObject(r: Reader, schema: EntrySchema): any {
  switch (schema.tag) {
    case 1:
      return r.i32();
    case 2:
      return Number(r.i64()); // may lose precision, but JS lacks 64-bit int; still usable for timestamps up to ~2^53
    case 3:
      return r.f64();
    case 4:
      return r.str();
    case 5:
      return r.u8() !== 0;
    case 6: {
      const ordinal = r.i32();
      if (ordinal < 0 || ordinal >= schema.constants.length) {
        throw new Error(`Invalid enum ordinal ${ordinal}`);
      }
      return schema.constants[ordinal];
    }
    case 7: {
      const len = r.i32();
      const arr = new Array(len);
      for (let i = 0; i < len; i++) arr[i] = readObject(r, schema.element);
      return arr;
    }
    case 0: {
      const obj: Record<string, any> = {};
      for (const [k, s] of Object.entries(schema.fields)) {
        obj[k] = readObject(r, s);
      }
      return obj;
    }
  }
}

export function decodeFlightRecorder(buffer: ArrayBuffer): DecodedLog {
  const r = new Reader(buffer);
  // Header: 2 bytes magic + 2 bytes version (short)
  const m0 = r.u8();
  const m1 = r.u8();
  const magic = String.fromCharCode(m0) + String.fromCharCode(m1);
  if (magic !== 'RR') {
    throw new Error(`Invalid log: wrong magic '${magic}', expected 'RR'`);
  }
  const version = r.i16();
  if (version !== 1) {
    throw new Error(`Unsupported log version: ${version}`);
  }

  const channels: ChannelInfo[] = [];
  const entries: LogEntry[] = [];

  while (!r.eof) {
    // Each entry starts with type int32
    const entryType = r.i32();
    if (r.eof && Number.isNaN(entryType)) break; // safety
    if (entryType === 0) {
      const chName = r.str();
      const schema = readSchema(r);
      channels.push({ name: chName, schema });
      entries.push({ type: 'schema', channelName: chName, schema });
    } else if (entryType === 1) {
      const channelIndex = r.i32();
      if (channelIndex < 0 || channelIndex >= channels.length) {
        throw new Error(
          `Invalid channel index ${channelIndex}; channels registered: ${channels.length}`
        );
      }
      const { name, schema } = channels[channelIndex];
      const data = readObject(r, schema);
      entries.push({ type: 'message', channelIndex, channelName: name, data });
    } else {
      throw new Error(`Unknown entry type: ${entryType}`);
    }
  }

  return { version, channels, entries };
}

export function toChannelBuckets(decoded: DecodedLog): Record<string, any[]> {
  const buckets: Record<string, any[]> = {};
  for (const ch of decoded.channels) buckets[ch.name] = [];
  for (const e of decoded.entries) if (e.type === 'message') buckets[e.channelName].push(e.data);
  return buckets;
}
