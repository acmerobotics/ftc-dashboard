import { LoopProfile, LoopSegment, UNIT_TO_MS } from './profiles';
import { LoopSample } from './useLoopSamples';

export type SegmentStats = {
  segment: LoopSegment;
  last: number | null;
  mean: number | null;
  max: number | null;
  /** Fraction of the most recent loop total, 0-1. */
  share: number;
};

export type LoopStats = {
  /** Per-sample loop totals in ms, oldest first. */
  totals: number[];
  lastTotal: number | null;
  meanTotal: number | null;
  maxTotal: number | null;
  p95Total: number | null;
  /** Worst single loop over the window, or null without a worst key. */
  maxWorst: number | null;
  hz: number | null;
  segments: SegmentStats[];
  /** Loop time in the last sample not covered by any segment, in ms. */
  unaccounted: number;
  hasUnaccounted: boolean;
};

// LoopTimer's total spans the clock reads between segments, so a loop that is
// fully instrumented still leaves a sliver over.
const MIN_UNACCOUNTED_SHARE = 0.005;

// Below this, nearest-rank p95 lands on the last element and just repeats Max.
const MIN_P95_SAMPLES = 20;

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function max(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => Math.max(a, b), -Infinity);
}

function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[index];
}

/**
 * Reduces the sample window into the numbers the view renders, all in
 * milliseconds. Only samples carrying the profile's keys count, so other
 * telemetry never blanks the breakdown, and a segment missing from a counted
 * sample did not run in it: it contributes 0.
 */
export default function computeStats(
  samples: LoopSample[],
  profile: LoopProfile,
): LoopStats {
  const scale = UNIT_TO_MS[profile.unit];
  const { segments, totalKey, worstKey } = profile;

  const segmentSeries = segments.map(() => [] as number[]);
  const totals: number[] = [];
  const worsts: number[] = [];
  let newest: LoopSample | null = null;

  for (const sample of samples) {
    if (worstKey !== null) {
      const raw = sample.values[worstKey];
      if (raw !== undefined) worsts.push(raw * scale);
    }

    const counted =
      totalKey === null
        ? segments.some((segment) => sample.values[segment.key] !== undefined)
        : sample.values[totalKey] !== undefined;
    if (!counted) continue;
    newest = sample;

    let segmentSum = 0;

    segments.forEach((segment, i) => {
      const raw = sample.values[segment.key];
      const ms = raw === undefined ? 0 : raw * scale;
      segmentSeries[i].push(ms);
      segmentSum += ms;
    });

    totals.push(
      totalKey === null ? segmentSum : sample.values[totalKey] * scale,
    );
  }

  const segmentLast = segments.map((segment) => {
    const raw = newest?.values[segment.key];
    return raw === undefined ? null : raw * scale;
  });

  const accountedLast = segmentLast.reduce<number>(
    (acc, value) => acc + (value ?? 0),
    0,
  );

  const lastTotal = totals.length === 0 ? null : totals[totals.length - 1];

  const segmentStats: SegmentStats[] = segments.map((segment, i) => {
    const last = segmentLast[i];

    return {
      segment,
      last,
      mean: mean(segmentSeries[i]),
      max: max(segmentSeries[i]),
      share:
        last === null || lastTotal === null || lastTotal <= 0
          ? 0
          : last / lastTotal,
    };
  });

  const meanTotal = mean(totals);
  const unaccounted =
    lastTotal === null ? 0 : Math.max(0, lastTotal - accountedLast);

  return {
    totals,
    lastTotal,
    meanTotal,
    maxTotal: max(totals),
    p95Total: totals.length < MIN_P95_SAMPLES ? null : percentile(totals, 95),
    maxWorst: max(worsts),
    hz: meanTotal !== null && meanTotal > 0 ? 1000 / meanTotal : null,
    segments: segmentStats,
    unaccounted,
    hasUnaccounted:
      totalKey !== null &&
      lastTotal !== null &&
      lastTotal > 0 &&
      unaccounted / lastTotal > MIN_UNACCOUNTED_SHARE,
  };
}

export function formatMs(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return value.toFixed(digits);
}
