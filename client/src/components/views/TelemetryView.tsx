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
// - primitives: double
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

  for (const f of fields) {
    if (f.type === 'double' || f.type === 'float64') {
      if (offset + 8 > dv.byteLength) {
        // can't decode more; stop without marking as truncated to avoid noise
        break;
      }
      const val = dv.getFloat64(offset, littleEndian);
      out[f.name] = val;
      offset += 8;
    } else if (nestedMap[f.type]) {
      const nestedSchema = nestedMap[f.type];
      if (offset >= dv.byteLength) {
        // no bytes left for nested
        break;
      }
      const slice = bytes.subarray(offset); // pass remaining bytes and let child consume what it can
      const res = decodeBySchema(slice, nestedSchema, nestedMap, littleEndian);
      // Only set the field if child decoded anything
      if (res.used > 0) {
        out[f.name] = res.value;
        offset += res.used;
      } else {
        // zero bytes consumed; stop
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
      if (f.type === 'double' || f.type === 'float64') {
        parts.push(`${f.name}=${formatNumber(v as number)}`);
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
