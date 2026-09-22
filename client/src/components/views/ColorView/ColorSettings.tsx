import { useEffect, useId, useState } from 'react';
import clsx from 'clsx';

import { NORMALIZATION_LABELS, NormalizationMode } from './colorUtils';
import { MIN_DIVISOR } from './expectedColor';
import inputClass from './inputClass';

type ColorSettingsProps = {
  mode: NormalizationMode;
  onModeChange: (mode: NormalizationMode) => void;
  divisor: number;
  onDivisorChange: (divisor: number) => void;
};

const ColorSettings = ({
  mode,
  onModeChange,
  divisor,
  onDivisorChange,
}: ColorSettingsProps) => {
  const instanceId = useId();
  const [divisorDraft, setDivisorDraft] = useState(String(divisor));

  useEffect(() => setDivisorDraft(String(divisor)), [divisor]);

  const onDivisorInput = (value: string) => {
    setDivisorDraft(value);

    const parsed = Number(value);
    if (
      value.trim() !== '' &&
      Number.isFinite(parsed) &&
      parsed >= MIN_DIVISOR
    ) {
      onDivisorChange(parsed);
    }
  };

  return (
    <div className="mb-4 rounded border border-gray-200 p-3 dark:border-slate-700">
      <h3 className="mb-2 font-medium">Display</h3>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm" htmlFor={`${instanceId}-normalization`}>
          Normalization
        </label>
        <select
          id={`${instanceId}-normalization`}
          className={inputClass}
          value={mode}
          onChange={(e) => onModeChange(e.target.value as NormalizationMode)}
        >
          {Object.entries(NORMALIZATION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {mode === 'manual' && (
          <input
            className={clsx(inputClass, 'w-24')}
            type="number"
            min={MIN_DIVISOR}
            step={1}
            aria-label="Manual divisor"
            value={divisorDraft}
            onChange={(e) => onDivisorInput(e.target.value)}
            onBlur={() => setDivisorDraft(String(divisor))}
          />
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
        Raw counts depend on the sensor and its gain. Auto keeps hue and
        saturation but throws away brightness, which is usually the most stable
        way to tell game elements apart.
      </p>
    </div>
  );
};

export default ColorSettings;
