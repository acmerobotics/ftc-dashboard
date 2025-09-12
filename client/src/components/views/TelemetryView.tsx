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
function parseSchema(schema: string): { type: string; name: string }[] {
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
  schema: string,
  nestedMap: Record<string, string>,
  littleEndian = true,
): DecodedResult {
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
      data: string[];
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

    // Determine latest struct descriptor from top-level struct fields
    setStructDesc(() => {
      let latest: { type: string; schema: string; nested?: { type: string; schema: string }[]; data: string[] } | null = null;
      for (const p of packets) {
        if (p.structType && p.structSchema && p.structData && p.structData.length) {
          latest = {
            type: p.structType,
            schema: p.structSchema,
            nested: p.structNested || [],
            data: p.structData,
          };
        }
      }
      return latest;
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

  // Render struct samples from latest descriptor
  const structBlocks = (() => {
    if (!structDesc) return [] as JSX.Element[];
    const { type, schema, nested, data: samples } = structDesc;
    const nestedMap: Record<string, string> = {};
    const addType = (t: string, s: string) => {
      nestedMap[t] = s; // fully-qualified
      const short = t.includes('.') ? t.substring(t.lastIndexOf('.') + 1) : t;
      nestedMap[short] = s; // simple name for unqualified refs in schema
    };
    (nested || []).forEach((n) => addType(n.type, n.schema));
    addType(type, schema);

    return samples.map((d, idx) => {
      const bytes = dataToUint8Array(d as any);
      const res = decodeBySchema(bytes, schema, nestedMap, true);
      const decoded = res.value;
      return (
        <div key={`struct_${idx}`} className="mt-2">
          <strong>{type}</strong>
          <pre>{JSON.stringify(decoded, null, 2)}</pre>
        </div>
      );
    });
  })();

  return (
    <BaseView isUnlocked={isUnlocked}>
      <BaseViewHeading isDraggable={isDraggable}>Telemetry</BaseViewHeading>
      <BaseViewBody>
        <p>{telemetryLines}</p>
        <p>{telemetryLog}</p>
        {structBlocks.length > 0 && (
          <div className="mt-2">
            <hr className="my-2" />
            <h3 className="font-semibold">Structs</h3>
            {structBlocks}
          </div>
        )}
      </BaseViewBody>
    </BaseView>
  );
};

export default TelemetryView;
