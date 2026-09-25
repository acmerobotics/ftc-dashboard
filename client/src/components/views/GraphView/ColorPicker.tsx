import { useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';

import { normalizeHexColor, sameColor, SWATCH_COLORS } from './colors';

type ColorSwatchButtonProps = {
  color: string;
  title: string;
  expanded: boolean;
  onClick: () => void;
};

export const ColorSwatchButton = ({
  color,
  title,
  expanded,
  onClick,
}: ColorSwatchButtonProps) => (
  <button
    type="button"
    className="icon-btn h-6 w-6 shrink-0 p-0.5"
    title={title}
    aria-label={title}
    aria-expanded={expanded}
    onClick={onClick}
  >
    <span
      className="h-full w-full rounded-sm ring-1 ring-inset ring-black/20"
      style={{ backgroundColor: color }}
    />
  </button>
);

type ColorPaletteProps = {
  color: string;
  onChange: (color: string) => void;
  onReset: () => void;
  onClose: () => void;
};

export const ColorPalette = ({
  color,
  onChange,
  onReset,
  onClose,
}: ColorPaletteProps) => {
  const id = useId();

  // null shows `color` itself
  const [hexInput, setHexInput] = useState<string | null>(null);
  const hexText = hexInput ?? color;
  const hexValid = normalizeHexColor(hexText) !== null;

  // Leave the field alone while it already spells the current color, or
  // normalizing '#abc' under the cursor makes shorthand impossible to type.
  useEffect(
    () =>
      setHexInput((current) =>
        current !== null &&
        normalizeHexColor(current) !== null &&
        sameColor(current, color)
          ? current
          : null,
      ),
    [color],
  );

  const containerRef = useRef<HTMLDivElement>(null);

  // Focus the palette so Escape works, and hand focus back on close so the
  // view's shortcuts still reach.
  useEffect(() => {
    const previous = document.activeElement;
    containerRef.current?.focus();

    return () => {
      // Only when closing dropped focus on the floor; switching rows leaves
      // the other row's swatch focused.
      const active = document.activeElement;
      if (active !== null && active !== document.body) return;

      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);

  const handleHexChange = (raw: string) => {
    setHexInput(raw);

    const normalized = normalizeHexColor(raw);
    if (normalized !== null) onChange(normalized);
  };

  // Drop typed text here rather than in the effect above, which runs a frame
  // late and not at all when the chosen color is the current one.
  const choose = (swatch: string) => {
    setHexInput(null);
    onChange(swatch);
  };

  const reset = () => {
    setHexInput(null);
    onReset();
  };

  return (
    <div
      ref={containerRef}
      className={clsx(
        'mt-1 mb-2 w-max max-w-full rounded border border-gray-200 bg-gray-50 p-2',
        'focus:outline-none dark:border-slate-600 dark:bg-slate-800',
      )}
      tabIndex={-1}
      onKeyDown={(evt) => {
        if (evt.key === 'Escape') {
          evt.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="grid w-max grid-cols-8 gap-1">
        {SWATCH_COLORS.map((swatch) => {
          const selected = sameColor(swatch, color);

          return (
            <button
              type="button"
              key={swatch}
              className={clsx(
                'h-5 w-5 rounded-sm ring-inset transition hover:scale-110',
                selected
                  ? 'ring-2 ring-gray-900 dark:ring-white'
                  : 'ring-1 ring-black/20',
              )}
              style={{ backgroundColor: swatch }}
              title={swatch}
              aria-label={swatch}
              aria-pressed={selected}
              onClick={() => choose(swatch)}
            />
          );
        })}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <label htmlFor={`${id}-hex`} className="shrink-0">
          Custom
        </label>
        <input
          id={`${id}-custom`}
          type="color"
          className="h-7 w-8 shrink-0 cursor-pointer rounded border border-gray-200 bg-transparent p-0.5 dark:border-slate-500"
          value={normalizeHexColor(color) ?? '#000000'}
          title="Pick a custom color"
          aria-label="Pick a custom color"
          onChange={(evt) => handleHexChange(evt.target.value)}
        />
        <input
          id={`${id}-hex`}
          type="text"
          className={clsx(
            'w-24 min-w-0 rounded border border-gray-200 bg-gray-100 px-2 py-1 transition',
            'focus:border-primary-500 focus:ring-primary-500',
            'dark:border-slate-500/80 dark:bg-slate-700 dark:text-slate-200',
            !hexValid &&
              'border-red-500 focus:border-red-500 focus:ring-red-500',
          )}
          value={hexText}
          spellCheck={false}
          placeholder="#rrggbb"
          onChange={(evt) => handleHexChange(evt.target.value)}
        />
        <button
          type="button"
          // not .icon-btn: that class lands after the utilities layer and would
          // override the resting border back to transparent
          className={clsx(
            'shrink-0 rounded border border-gray-300 px-2 py-1 transition-colors',
            'hover:bg-gray-200 focus:outline-none',
            'focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-opacity-30',
            'dark:border-slate-500 dark:hover:bg-slate-700',
          )}
          title="Restore the automatically assigned color"
          onClick={reset}
        >
          Reset
        </button>
      </div>
    </div>
  );
};
