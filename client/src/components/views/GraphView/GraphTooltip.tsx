import { useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';

import { formatValue, HoverInfo } from './Graph';

const CURSOR_OFFSET = 14;

type GraphTooltipProps = {
  hover: HoverInfo;
  // dimensions of the container the tooltip is positioned within
  width: number;
  height: number;
};

type Size = {
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export default function GraphTooltip({
  hover,
  width,
  height,
}: GraphTooltipProps) {
  const { cursorX, cursorY, entries, nearestName } = hover;

  const tooltipRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size | null>(null);

  useLayoutEffect(() => {
    const tooltip = tooltipRef.current;
    if (tooltip === null) return;

    const measured = {
      width: tooltip.offsetWidth,
      height: tooltip.offsetHeight,
    };

    setSize((prev) =>
      prev !== null &&
      prev.width === measured.width &&
      prev.height === measured.height
        ? prev
        : measured,
    );
  }, [entries]);

  // the tooltip sits to the right of the cursor unless the whole box fits
  // better on the left; either way it stays inside the container
  const flip = size !== null && cursorX + CURSOR_OFFSET + size.width > width;
  const left =
    size === null
      ? cursorX
      : clamp(
          flip ? cursorX - CURSOR_OFFSET - size.width : cursorX + CURSOR_OFFSET,
          0,
          width - size.width,
        );
  const top =
    size === null
      ? cursorY
      : clamp(cursorY - size.height / 2, 0, height - size.height);

  return (
    <div
      ref={tooltipRef}
      className={clsx(
        'pointer-events-none absolute z-10 rounded border py-1 px-2 shadow-lg',
        'border-gray-200 bg-white/95 text-gray-900',
        'dark:border-slate-600 dark:bg-slate-800/95 dark:text-slate-100',
      )}
      style={{
        left,
        top,
        // hidden until the first measurement lands, to avoid a visible jump
        visibility: size === null ? 'hidden' : 'visible',
      }}
    >
      <table className="border-separate" style={{ borderSpacing: '0 1px' }}>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.name}
              className={clsx(
                'text-xs leading-tight',
                entry.name === nearestName ? 'font-bold' : 'font-medium',
              )}
            >
              <td className="pr-1 align-middle">
                <span
                  className="inline-block h-2 w-2 rounded-full align-middle"
                  style={{ backgroundColor: entry.color }}
                />
              </td>
              <td className="whitespace-nowrap pr-3 align-middle">
                {entry.name}
              </td>
              <td className="whitespace-nowrap text-right align-middle font-mono">
                {formatValue(entry.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
