import twColors from 'tailwindcss/colors';

import { useTheme } from '@/hooks/useTheme';

import { formatMs } from './stats';

const BUDGET_COLOR = twColors.red[500];
const LINE_COLOR_DARK = twColors.sky[400];
const LINE_COLOR_LIGHT = twColors.blue[600];

const WIDTH = 100;
const HEIGHT = 28;

type SparklineProps = {
  /** Loop totals in ms, oldest first. */
  values: number[];
  /** Target loop time in ms; drawn as a dashed line. 0 hides it. */
  budgetMs: number;
};

/**
 * Loop total over the sample window. Drawn in a 100x28 user-space viewBox and
 * stretched to the container, so the stroke is width-compensated.
 */
const Sparkline = ({ values, budgetMs }: SparklineProps) => {
  const { isDarkMode } = useTheme();

  if (values.length < 2) {
    return (
      <div className="flex-center h-12 rounded border border-dashed border-gray-300 text-xs text-gray-500 dark:border-slate-700 dark:text-slate-400">
        Collecting samples…
      </div>
    );
  }

  const lo = Math.min(...values, budgetMs > 0 ? budgetMs : Infinity);
  const hi = Math.max(...values, budgetMs > 0 ? budgetMs : -Infinity);
  // Guard against a flat series collapsing the vertical scale.
  const span = hi - lo < 1e-6 ? 1 : hi - lo;

  const toY = (value: number) =>
    HEIGHT - ((value - lo) / span) * (HEIGHT - 2) - 1;

  const points = values
    .map((value, i) => {
      const x = (i / (values.length - 1)) * WIDTH;
      return `${x.toFixed(2)},${toY(value).toFixed(2)}`;
    })
    .join(' ');

  const overBudget = budgetMs > 0 && values[values.length - 1] > budgetMs;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-12 w-full"
        role="img"
        aria-label="Loop time history"
      >
        {budgetMs > 0 && (
          <line
            x1={0}
            x2={WIDTH}
            y1={toY(budgetMs)}
            y2={toY(budgetMs)}
            stroke={BUDGET_COLOR}
            strokeWidth={0.5}
            strokeDasharray="2 2"
            vectorEffect="non-scaling-stroke"
          />
        )}
        <polyline
          points={points}
          fill="none"
          stroke={
            overBudget
              ? BUDGET_COLOR
              : isDarkMode
              ? LINE_COLOR_DARK
              : LINE_COLOR_LIGHT
          }
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between px-1 text-[0.6rem] text-gray-500 dark:text-slate-400">
        <span>{formatMs(hi, 1)} ms</span>
        <span>{values.length} samples</span>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-1 text-[0.6rem] text-gray-500 dark:text-slate-400">
        {formatMs(lo, 1)} ms
      </div>
    </div>
  );
};

export default Sparkline;
