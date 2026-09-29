import twColors from 'tailwindcss/colors';

import { LoopStats, formatMs } from './stats';

const UNACCOUNTED_COLOR = twColors.slate[400];

type BreakdownBarProps = {
  stats: LoopStats;
};

/**
 * Stacked bar of where the most recent loop's time went, sized by share of the
 * loop total, plus an "unaccounted" slice when stats.hasUnaccounted.
 */
const BreakdownBar = ({ stats }: BreakdownBarProps) => {
  const { lastTotal, segments, unaccounted, hasUnaccounted } = stats;

  const slices = segments
    .filter((stat) => stat.last !== null && stat.last > 0)
    .map((stat) => ({
      id: stat.segment.id,
      label: stat.segment.label,
      color: stat.segment.color,
      value: stat.last as number,
    }));

  if (hasUnaccounted) {
    slices.push({
      id: '__unaccounted__',
      label: 'Unaccounted',
      color: UNACCOUNTED_COLOR,
      value: unaccounted,
    });
  }

  const denominator =
    lastTotal !== null && lastTotal > 0
      ? lastTotal
      : slices.reduce((acc, slice) => acc + slice.value, 0);

  if (slices.length === 0 || denominator <= 0) {
    return <div className="h-7 w-full rounded bg-gray-200 dark:bg-slate-700" />;
  }

  return (
    <div className="flex h-7 w-full overflow-hidden rounded bg-gray-200 dark:bg-slate-700">
      {slices.map((slice) => {
        const share = slice.value / denominator;
        return (
          <div
            key={slice.id}
            className="flex h-full items-center justify-center overflow-hidden"
            style={{
              width: `${Math.max(0, Math.min(1, share)) * 100}%`,
              background: slice.color,
            }}
            title={`${slice.label}: ${formatMs(slice.value)} ms (${(
              share * 100
            ).toFixed(1)}%)`}
          >
            {share > 0.12 && (
              <span className="truncate px-1 text-[0.65rem] font-medium text-white">
                {(share * 100).toFixed(0)}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BreakdownBar;
