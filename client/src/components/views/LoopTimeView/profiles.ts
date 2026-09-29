import twColors from 'tailwindcss/colors';
import { v4 as uuidv4 } from 'uuid';

export type TimeUnit = 'ns' | 'us' | 'ms' | 's';

export const UNIT_LABELS: Record<TimeUnit, string> = {
  ns: 'nanoseconds',
  us: 'microseconds',
  ms: 'milliseconds',
  s: 'seconds',
};

/** Multiplier that converts a value in the given unit to milliseconds. */
export const UNIT_TO_MS: Record<TimeUnit, number> = {
  ns: 1e-6,
  us: 1e-3,
  ms: 1,
  s: 1000,
};

const UNITS = Object.keys(UNIT_TO_MS) as TimeUnit[];

export type LoopSegment = {
  id: string;
  key: string;
  label: string;
  /** Bar color as `#rrggbb`. */
  color: string;
};

export type LoopProfile = {
  id: string;
  name: string;
  unit: TimeUnit;
  /** Telemetry key for the whole loop; null means sum the segments. */
  totalKey: string | null;
  /** Key for the window's worst single loop, if the robot reports one. */
  worstKey: string | null;
  /** Loop time target in ms; drives the over-budget warning. 0 disables it. */
  budgetMs: number;
  segments: LoopSegment[];
};

export type LoopProfileStore = {
  profiles: LoopProfile[];
  activeId: string;
};

export const PROFILES_STORAGE_KEY = 'loopTimeProfiles';

/** Distinct hues that stay legible against both themes. */
const SEGMENT_PALETTE = [
  twColors.blue[500],
  twColors.amber[500],
  twColors.emerald[500],
  twColors.red[500],
  twColors.violet[500],
  twColors.pink[500],
  twColors.teal[500],
  twColors.orange[500],
  twColors.indigo[500],
  twColors.lime[500],
];

function nextPaletteColor(used: number): string {
  return SEGMENT_PALETTE[used % SEGMENT_PALETTE.length];
}

/** Turns a telemetry key into a label: `loop/vision` becomes `Vision`. */
export function labelFromKey(key: string): string {
  const tail = key.split(/[/.]/).pop() ?? key;
  const trimmed = tail.replace(/[_-]/g, ' ').trim();
  if (trimmed === '') return key;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function newSegment(key: string, usedCount: number): LoopSegment {
  return {
    id: uuidv4(),
    key,
    label: labelFromKey(key),
    color: nextPaletteColor(usedCount),
  };
}

export function newProfile(name: string): LoopProfile {
  return {
    id: uuidv4(),
    name,
    unit: 'ms',
    totalKey: null,
    worstKey: null,
    budgetMs: 0,
    segments: [],
  };
}

export function defaultStore(): LoopProfileStore {
  const profile = newProfile('Default');
  return { profiles: [profile], activeId: profile.id };
}

function sanitizeSegment(raw: unknown): LoopSegment[] {
  if (typeof raw !== 'object' || raw === null) return [];

  const { id, key, label, color } = raw as Record<string, unknown>;
  if (typeof key !== 'string' || key === '') return [];

  return [
    {
      id: typeof id === 'string' && id !== '' ? id : uuidv4(),
      key,
      label: typeof label === 'string' && label !== '' ? label : key,
      color:
        typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)
          ? color
          : SEGMENT_PALETTE[0],
    },
  ];
}

function sanitizeProfile(raw: unknown): LoopProfile[] {
  if (typeof raw !== 'object' || raw === null) return [];

  const { id, name, unit, totalKey, worstKey, budgetMs, segments } =
    raw as Record<string, unknown>;

  const total =
    typeof totalKey === 'string' && totalKey !== '' ? totalKey : null;
  const worst =
    typeof worstKey === 'string' && worstKey !== '' && worstKey !== total
      ? worstKey
      : null;

  // A key used twice would count twice: shares pass 100% and the bar clips.
  const claimed = new Set([total, worst].filter((key) => key !== null));
  const parsed = (
    Array.isArray(segments) ? segments.flatMap(sanitizeSegment) : []
  ).filter((segment) => {
    if (claimed.has(segment.key)) return false;
    claimed.add(segment.key);
    return true;
  });

  return [
    {
      id: typeof id === 'string' && id !== '' ? id : uuidv4(),
      name: typeof name === 'string' && name !== '' ? name : 'Profile',
      unit: UNITS.includes(unit as TimeUnit) ? (unit as TimeUnit) : 'ms',
      totalKey: total,
      worstKey: worst,
      budgetMs:
        typeof budgetMs === 'number' &&
        Number.isFinite(budgetMs) &&
        budgetMs > 0
          ? budgetMs
          : 0,
      segments: parsed,
    },
  ];
}

/**
 * Re-validates the stored profiles. Runs against whatever JSON localStorage
 * holds, including imports pasted in by the user, so it assumes no shape.
 */
export function sanitizeStore(raw: unknown): LoopProfileStore {
  if (typeof raw !== 'object' || raw === null) return defaultStore();

  const { profiles, activeId } = raw as Record<string, unknown>;
  const parsed = Array.isArray(profiles)
    ? profiles.flatMap(sanitizeProfile)
    : [];

  if (parsed.length === 0) return defaultStore();

  const active =
    typeof activeId === 'string' && parsed.some((p) => p.id === activeId)
      ? activeId
      : parsed[0].id;

  return { profiles: parsed, activeId: active };
}
