import { useEffect, useId, useState } from 'react';
import clsx from 'clsx';

import ColorSwatch from './ColorSwatch';
import {
  NormalizationMode,
  RGB,
  deltaE2000,
  hexToRgb,
  hueDistance,
  isAchromatic,
  normalizeToDisplay,
  parseColorInput,
  rgbToHex,
  rgbToHsv,
} from './colorUtils';
import {
  COLOR_PRESETS,
  ExpectedColor,
  MAX_TOLERANCE,
  MIN_TOLERANCE,
} from './expectedColor';
import inputClass from './inputClass';

type StatRowProps = {
  label: string;
  expected: string;
  sensed: string;
};

const StatRow = ({ label, expected, sensed }: StatRowProps) => (
  <tr>
    <td className="py-1 pr-3 text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
      {label}
    </td>
    <td className="py-1 pr-3 font-mono text-sm">{expected}</td>
    <td className="py-1 font-mono text-sm">{sensed}</td>
  </tr>
);

type ExpectedColorPanelProps = {
  expected: ExpectedColor;
  onExpectedChange: (expected: ExpectedColor) => void;
  sensed: RGB;
  mode: NormalizationMode;
  isStale: boolean;
};

const ExpectedColorPanel = ({
  expected,
  onExpectedChange,
  sensed,
  mode,
  isStale,
}: ExpectedColorPanelProps) => {
  const instanceId = useId();

  // Lets the text box hold whatever the user is mid-typing without stomping
  // on it every render, while still falling back to the last valid color.
  const [draft, setDraft] = useState(expected.hex);

  const [toleranceDraft, setToleranceDraft] = useState(
    String(expected.tolerance),
  );

  // Both values are shared, so another view or tab can change them underneath
  // a box nobody is typing into.
  useEffect(() => setDraft(expected.hex), [expected.hex]);
  useEffect(
    () => setToleranceDraft(String(expected.tolerance)),
    [expected.tolerance],
  );

  const commitDraft = (value: string) => {
    if (value === expected.hex) return;

    const parsed = parseColorInput(value);
    if (parsed !== null) {
      onExpectedChange({ ...expected, hex: rgbToHex(parsed) });
    } else {
      setDraft(expected.hex);
    }
  };

  const onToleranceInput = (value: string) => {
    setToleranceDraft(value);

    const parsed = Number(value);
    if (value.trim() === '' || !Number.isFinite(parsed)) return;
    if (parsed < MIN_TOLERANCE || parsed > MAX_TOLERANCE) return;

    onExpectedChange({ ...expected, tolerance: parsed });
  };

  const expectedRgb = hexToRgb(expected.hex) ?? { r: 0, g: 0, b: 0 };

  // Auto scales the sensed reading to its peak channel, so the expected color
  // has to be scaled the same way for the two to be comparable.
  const peakNormalized = mode === 'auto';
  const shownExpected = peakNormalized
    ? normalizeToDisplay(expectedRgb, 'auto')
    : expectedRgb;

  const expectedHsv = rgbToHsv(shownExpected);
  const sensedHsv = rgbToHsv(sensed);

  const deltaE = deltaE2000(shownExpected, sensed);
  const hueDelta = hueDistance(expectedHsv.h, sensedHsv.h);
  const withinTolerance = deltaE <= expected.tolerance;

  // Auto and Alpha both divide the reading by a brightness proxy, so neither
  // can separate white from grey from black.
  const brightnessBlind =
    (mode === 'auto' || mode === 'alpha') && isAchromatic(expectedRgb);

  const sensedCell = (value: string) => (isStale ? '-' : value);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label
            className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
            htmlFor={`${instanceId}-color`}
          >
            Expected color
          </label>
          <input
            id={`${instanceId}-color`}
            className={clsx(inputClass, 'w-36')}
            placeholder="#rrggbb or r, g, b"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={(e) => commitDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
            htmlFor={`${instanceId}-preset`}
          >
            Preset
          </label>
          <select
            id={`${instanceId}-preset`}
            className={inputClass}
            value=""
            onChange={(e) => {
              if (e.target.value === '') return;
              setDraft(e.target.value);
              onExpectedChange({ ...expected, hex: e.target.value });
            }}
          >
            <option value="">Choose a preset…</option>
            {COLOR_PRESETS.map((preset) => (
              <option key={preset.hex} value={preset.hex}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
            htmlFor={`${instanceId}-tolerance`}
          >
            Tol ΔE
          </label>
          <input
            id={`${instanceId}-tolerance`}
            className={clsx(inputClass, 'w-16')}
            type="number"
            min={MIN_TOLERANCE}
            max={MAX_TOLERANCE}
            step={1}
            value={toleranceDraft}
            onChange={(e) => onToleranceInput(e.target.value)}
            onBlur={() => setToleranceDraft(String(expected.tolerance))}
          />
        </div>

        {!isStale &&
          (brightnessBlind ? (
            <p className="mb-0.5 max-w-sm text-xs text-gray-500 dark:text-slate-400">
              This mode divides brightness out, so white, grey and black cannot
              be told apart. Switch to Manual and set the divisor to the raw
              count your sensor reads on a white surface.
            </p>
          ) : (
            <span
              className={clsx(
                'mb-0.5 rounded px-2 py-1 text-xs font-semibold uppercase tracking-wide',
                withinTolerance
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500 dark:bg-slate-700 dark:text-slate-400',
              )}
            >
              {withinTolerance ? 'Match' : 'No match'}
            </span>
          ))}
      </div>

      <div className="mt-3 flex items-stretch gap-3">
        <div className="flex-1">
          <ColorSwatch color={shownExpected} className="h-20 w-full" />
          <p className="mt-1 text-center font-mono text-xs text-gray-500 dark:text-slate-400">
            Expected - {rgbToHex(shownExpected)}
          </p>
        </div>
        <div className="flex-1">
          <ColorSwatch
            color={sensed}
            className={clsx('h-20 w-full', isStale && 'opacity-40 grayscale')}
          />
          <p className="mt-1 text-center font-mono text-xs text-gray-500 dark:text-slate-400">
            Sensed - {isStale ? 'no live reading' : rgbToHex(sensed)}
          </p>
        </div>
      </div>

      <div className="mt-3 rounded border border-gray-200 p-3 dark:border-slate-700">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
              <th className="pb-1 font-medium"> </th>
              <th className="pb-1 font-medium">Expected</th>
              <th className="pb-1 font-medium">Sensed</th>
            </tr>
          </thead>
          <tbody>
            <StatRow
              label="Hex"
              expected={rgbToHex(shownExpected)}
              sensed={sensedCell(rgbToHex(sensed))}
            />
            <StatRow
              label="R"
              expected={`${shownExpected.r}`}
              sensed={sensedCell(`${Math.round(sensed.r)}`)}
            />
            <StatRow
              label="G"
              expected={`${shownExpected.g}`}
              sensed={sensedCell(`${Math.round(sensed.g)}`)}
            />
            <StatRow
              label="B"
              expected={`${shownExpected.b}`}
              sensed={sensedCell(`${Math.round(sensed.b)}`)}
            />
            <StatRow
              label="Hue"
              expected={`${expectedHsv.h.toFixed(0)}°`}
              sensed={sensedCell(`${sensedHsv.h.toFixed(0)}°`)}
            />
            <StatRow
              label="Sat"
              expected={`${(expectedHsv.s * 100).toFixed(0)}%`}
              sensed={sensedCell(`${(sensedHsv.s * 100).toFixed(0)}%`)}
            />
            <StatRow
              label="Val"
              expected={`${(expectedHsv.v * 100).toFixed(0)}%`}
              sensed={sensedCell(`${(sensedHsv.v * 100).toFixed(0)}%`)}
            />
          </tbody>
        </table>
        {!isStale && (
          <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 text-xs text-gray-500 dark:border-slate-700 dark:text-slate-400">
            <span>
              {peakNormalized ? 'ΔE (hue and chroma)' : 'ΔE'}{' '}
              {deltaE.toFixed(1)}
            </span>
            <span>Δhue {hueDelta.toFixed(0)}°</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpectedColorPanel;
