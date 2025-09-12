import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import BaseView, {
  BaseViewHeading,
  BaseViewBody,
  BaseViewProps,
  BaseViewHeadingProps,
} from './BaseView';
import { RootState } from '@/store/reducers';

type TelemetryViewProps = BaseViewProps & BaseViewHeadingProps;

function dataToUint8Array(input: any): Uint8Array {
  // Already bytes
  if (input instanceof Uint8Array) return input;
  // If it's an array of numbers, convert directly
  if (Array.isArray(input)) {
    try {
      return new Uint8Array(input as number[]);
    } catch {
      return new Uint8Array();
    }
  }
  // Expect a base64 string; normalize and decode
  if (typeof input === 'string') {
    let s = input.trim().replace(/[\r\n\t\s]+/g, '');
    // Try standard base64 first; add padding if needed
    const addPadding = (str: string) => {
      const m = str.length % 4;
      if (m === 2) return str + '==';
      if (m === 3) return str + '=';
      if (m === 1) return str + '==='; // extremely malformed, but try
      return str;
    };
    const decode = (str: string) => {
      const bin = atob(str);
      const len = bin.length;
      const out = new Uint8Array(len);
      for (let i = 0; i < len; i++) out[i] = bin.charCodeAt(i) & 0xff;
      return out;
    };
    try {
      return decode(addPadding(s));
    } catch {
      // Try URL-safe base64 fallback
      try {
        s = s.replace(/-/g, '+').replace(/_/g, '/');
        return decode(addPadding(s));
      } catch {
        return new Uint8Array();
      }
    }
  }
  return new Uint8Array();
}

// Very small schema parser/decoder supporting:
// - primitives: bool, char, int8/16/32/64, uint8/16/32/64, float/float32, double/float64
// - nested user types supplied in sample.nested (by name)
// Grammar: "<Type> <name>; <Type> <name>; ..."
// Example: "double x;double y" or "Vector2d position;Rotation2d heading"
function parseSchema(schema?: string): { type: string; name: string }[] {
  if (!schema || typeof schema !== 'string') return [];
  return schema
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const parts = entry.split(/\s+/);
      const name = parts.pop() ?? '';
      const type = parts.join(' ');
      return { type, name };
    });
}

type DecodedResult = { value: any; used: number };
function decodeBySchema(
  bytes: Uint8Array,
  schema: string | undefined,
  nestedMap: Record<string, string>,
  littleEndian = true,
): DecodedResult {
  if (!schema) {
    return { value: {}, used: 0 };
  }
  const fields = parseSchema(schema);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  const out: any = {};

  const need = (n: number) => offset + n <= dv.byteLength;
  const toNum = (v: bigint) => {
    const num = Number(v);
    return Number.isSafeInteger(num) ? num : v; // keep BigInt if not safe
  };

  for (const f of fields) {
    const t = f.type;
    if (t === 'double' || t === 'float64') {
      if (!need(8)) break;
      out[f.name] = dv.getFloat64(offset, littleEndian);
      offset += 8;
    } else if (t === 'float' || t === 'float32') {
      if (!need(4)) break;
      out[f.name] = dv.getFloat32(offset, littleEndian);
      offset += 4;
    } else if (t === 'bool' || t === 'boolean') {
      if (!need(1)) break;
      out[f.name] = dv.getUint8(offset) !== 0;
      offset += 1;
    } else if (t === 'char') {
      if (!need(1)) break;
      const code = dv.getUint8(offset);
      out[f.name] = String.fromCharCode(code);
      offset += 1;
    } else if (t === 'int8') {
      if (!need(1)) break;
      out[f.name] = dv.getInt8(offset);
      offset += 1;
    } else if (t === 'uint8') {
      if (!need(1)) break;
      out[f.name] = dv.getUint8(offset);
      offset += 1;
    } else if (t === 'int16') {
      if (!need(2)) break;
      out[f.name] = dv.getInt16(offset, littleEndian);
      offset += 2;
    } else if (t === 'uint16') {
      if (!need(2)) break;
      out[f.name] = dv.getUint16(offset, littleEndian);
      offset += 2;
    } else if (t === 'int32') {
      if (!need(4)) break;
      out[f.name] = dv.getInt32(offset, littleEndian);
      offset += 4;
    } else if (t === 'uint32') {
      if (!need(4)) break;
      out[f.name] = dv.getUint32(offset, littleEndian);
      offset += 4;
    } else if (t === 'int64') {
      if (!need(8)) break;
      const v = dv.getBigInt64(offset, littleEndian);
      out[f.name] = toNum(v);
      offset += 8;
    } else if (t === 'uint64') {
      if (!need(8)) break;
      const v = dv.getBigUint64(offset, littleEndian);
      out[f.name] = toNum(v);
      offset += 8;
    } else if (nestedMap[t]) {
      const nestedSchema = nestedMap[t];
      if (offset >= dv.byteLength) {
        break;
      }
      const slice = bytes.subarray(offset);
      const res = decodeBySchema(slice, nestedSchema, nestedMap, littleEndian);
      if (res.used > 0) {
        out[f.name] = res.value;
        offset += res.used;
      } else {
        break;
      }
    } else {
      // Unknown type; include a marker but continue
      out[f.name] = '(unknown)';
    }
  }

  return { value: out, used: offset };
}

const TelemetryView = ({
  isDraggable = false,
  isUnlocked = false,
}: TelemetryViewProps) => {
  const [log, setLog] = useState<string[]>([]);
  const [data, setData] = useState<{ [key: string]: string }>({});
  const [structDesc, setStructDesc] = useState<{
      type: string;
      schema: string;
      nested?: { type: string; schema: string }[];
      data: { key: string; data: string }[];
    } | null>(null);

  const packets = useSelector((state: RootState) => state.telemetry);
  useEffect(() => {
    if (packets.length === 0) {
      setLog([]);
      setData({});
      setStructDesc(null);
      return;
    }

    setLog((prevLog) =>
      packets.reduce(
        (acc, { log: newLog }) => (newLog.length === 0 ? acc : newLog),
        prevLog,
      ),
    );

    setData((prevData) =>
      packets.reduce(
        (acc, { data: newData }) =>
          Object.keys(newData).reduce(
            (acc, k) => ({ ...acc, [k]: newData[k] }),
            acc,
          ),
        prevData,
      ),
    );

    // Determine latest struct descriptor from top-level struct fields (new format)
    setStructDesc((prev) => {
      let latest: { type: string; schema: string; nested?: { type: string; schema: string }[]; data: { key: string; data: string }[] } | null = null;
      for (const p of packets) {
        if (p.struct && p.structData) {
          const entries = Object.entries(p.structData).map(([k, v]) => ({ key: k, data: v }));
          if (entries.length > 0) {
            latest = {
              type: p.struct.type,
              schema: p.struct.schema,
              nested: p.struct.nested || [],
              data: entries,
            };
          }
        }
      }
      return latest || prev;
    });
  }, [packets]);

  const telemetryLines = Object.keys(data).map((key) => (
    <span
      key={key}
      dangerouslySetInnerHTML={{ __html: `${key}: ${data[key]}<br />` }}
    />
  ));

  const telemetryLog = log.map((line, i) => (
    <span key={i} dangerouslySetInnerHTML={{ __html: `${line}<br />` }} />
  ));

  // Helpers to compactly format decoded structs
  function formatNumber(n: number): string {
    if (!isFinite(n)) return String(n);
    const s = Math.abs(n) >= 1000 || (Math.abs(n) > 0 && Math.abs(n) < 0.001)
      ? n.toExponential(3)
      : n.toFixed(3);
    return s.replace(/\.0+($|e)/, '$1').replace(/(\.\d*?)0+($|e)/, '$1$2');
  }
  function shortTypeName(t: string): string {
    return t.includes('.') ? t.substring(t.lastIndexOf('.') + 1) : t;
  }
  function formatStructCompact(
    obj: any,
    typeName: string,
    schemaStr: string,
    nestedMap: Record<string, string>,
  ): string {
    const fields = parseSchema(schemaStr);
    const parts: string[] = [];
    for (const f of fields) {
      const v = obj[f.name];
      if (v == null) continue;
      const t = f.type;
      if (t === 'double' || t === 'float64' || t === 'float' || t === 'float32') {
        parts.push(`${f.name}=${formatNumber(v as number)}`);
      } else if (t === 'bool' || t === 'boolean') {
        parts.push(`${f.name}=${v ? 'true' : 'false'}`);
      } else if (t === 'char') {
        parts.push(`${f.name}='${String(v)}'`);
      } else if (t === 'int8' || t === 'uint8' || t === 'int16' || t === 'uint16' || t === 'int32' || t === 'uint32') {
        parts.push(`${f.name}=${String(v)}`);
      } else if (t === 'int64' || t === 'uint64') {
        const str = typeof v === 'bigint' ? (v as bigint).toString() : String(v);
        parts.push(`${f.name}=${str}`);
      } else if (nestedMap[f.type]) {
        const childSchema = nestedMap[f.type];
        parts.push(
          `${f.name}=${formatStructCompact(v, shortTypeName(f.type), childSchema, nestedMap)}`,
        );
      } else {
        parts.push(`${f.name}=?`);
      }
    }
    return `${shortTypeName(typeName)}(${parts.join(', ')})`;
  }

  // Render struct samples from latest descriptor
  const structBlocks = (() => {
    if (!structDesc) return [] as JSX.Element[];
    const { type, schema, nested, data: samples } = structDesc;
    const nestedMap: Record<string, string> = {};
    const addType = (t?: string, s?: string) => {
      if (!t || !s) return; // defensively ignore malformed entries
      nestedMap[t] = s; // fully-qualified
      const short = t.includes('.') ? t.substring(t.lastIndexOf('.') + 1) : t;
      nestedMap[short] = s; // simple name for unqualified refs in schema
    };
    (nested || []).forEach((n) => addType(n.type, n.schema));
    addType(type, schema);

    return samples.map((entry, idx) => {
      const bytes = dataToUint8Array(entry.data as any);
      const res = decodeBySchema(bytes, schema, nestedMap, true);
      const decoded = res.value;
      const compact = formatStructCompact(decoded, type, schema, nestedMap);
      return (
        <span key={`struct_${idx}`} dangerouslySetInnerHTML={{ __html: `${entry.key}: ${compact}<br />` }} />
      );
    });
  })();

  return (
    <BaseView isUnlocked={isUnlocked}>
      <BaseViewHeading isDraggable={isDraggable}>Telemetry</BaseViewHeading>
      <BaseViewBody>
        <p>{telemetryLines}{structBlocks}</p>
        <p>{telemetryLog}</p>
      </BaseViewBody>
    </BaseView>
  );
};

export default TelemetryView;
