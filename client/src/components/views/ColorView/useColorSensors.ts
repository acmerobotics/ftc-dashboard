import { useSelector } from 'react-redux';

import { RootState } from '@/store/reducers';
import { HARDWARE_CATEGORY } from '@/store/reducers/config';
import { ConfigVarState, CustomVarState } from '@/store/types/config';

import { NormalizationMode, RGB, normalizeToDisplay } from './colorUtils';

export const COLOR_SENSOR_CATEGORY = 'Color Sensors';

export type ColorSensorReading = {
  name: string;
  /** Raw counts straight off the sensor; scale varies by device and gain. */
  raw: RGB;
  /** 0-1 values from NormalizedColorSensor, when the device supports it. */
  normalized: RGB | null;
  rawAlpha: number | null;
  normalizedAlpha: number | null;
  port: string | null;
};

function readNumber(
  value: Record<string, ConfigVarState>,
  key: string,
): number | null {
  const entry = value[key];
  if (entry === undefined || entry.__type === 'custom') return null;

  const raw = entry.__value;
  if (raw === null || typeof raw === 'boolean') return null;

  const parsed = typeof raw === 'number' ? raw : parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function readTriple(
  value: Record<string, ConfigVarState>,
  prefix: string,
): RGB | null {
  const r = readNumber(value, `${prefix}Red`);
  const g = readNumber(value, `${prefix}Green`);
  const b = readNumber(value, `${prefix}Blue`);

  if (r === null || g === null || b === null) return null;
  return { r, g, b };
}

/** Port keys carry their hub's name, e.g. "Expansion Hub 2 Port". */
function readPort(value: Record<string, ConfigVarState>): string | null {
  const key = Object.keys(value).find((k) => k.endsWith(' Port'));
  if (key === undefined) return null;

  const entry = value[key];
  if (entry === undefined || entry.__type === 'custom') return null;
  if (entry.__value === null) return null;

  return `${key.replace(/ Port$/, '')} port ${entry.__value}`;
}

function parseSensor(
  name: string,
  state: ConfigVarState,
): ColorSensorReading | null {
  if (state.__type !== 'custom' || state.__value === null) return null;

  const value = state.__value;
  const raw = readTriple(value, '');
  if (raw === null) return null;

  return {
    name,
    raw,
    normalized: readTriple(value, 'Normalized '),
    rawAlpha: readNumber(value, 'Alpha'),
    normalizedAlpha: readNumber(value, 'Normalized Alpha'),
    port: readPort(value),
  };
}

/** Maps a reading onto a 0-255 triple suitable for display and comparison. */
export function displayColor(
  sensor: ColorSensorReading,
  mode: NormalizationMode,
  divisor: number,
): RGB {
  switch (mode) {
    case 'byte':
      return normalizeToDisplay(sensor.raw, 'byte');
    case 'manual':
      return normalizeToDisplay(sensor.raw, 'manual', { divisor });
    case 'alpha':
      // A REV V3's normalized alpha is a readable-brightness estimate rather
      // than a channel scale, so only the raw pair divides sensibly.
      return sensor.rawAlpha !== null
        ? normalizeToDisplay(sensor.raw, 'alpha', { alpha: sensor.rawAlpha })
        : normalizeToDisplay(sensor.normalized ?? sensor.raw, 'alpha', {
            alpha: sensor.normalizedAlpha,
          });
    case 'auto':
    default:
      // Scaling to the peak channel preserves ratios, so both inputs agree.
      return normalizeToDisplay(sensor.normalized ?? sensor.raw, 'auto');
  }
}

function parseCategory(category: ConfigVarState): ColorSensorReading[] {
  if (category.__type !== 'custom' || category.__value === null) return [];

  const sensors = category.__value;
  return Object.keys(sensors)
    .sort()
    .map((name) => parseSensor(name, sensors[name]))
    .filter((sensor): sensor is ColorSensorReading => sensor !== null);
}

/** Every color sensor published into the hardware config tree. */
export default function useColorSensors(): ColorSensorReading[] {
  const hardwareRoot = useSelector((state: RootState) => {
    const configRoot = state.config.configRoot as CustomVarState;
    const hardware = configRoot.__value?.[HARDWARE_CATEGORY];
    if (hardware === undefined || hardware.__type !== 'custom') return null;

    return hardware.__value;
  });

  if (hardwareRoot === null || hardwareRoot === undefined) return [];

  // The demo op mode publishes under a suffixed category rather than overwrite
  // the Hardware op mode's, so every category with this prefix is read.
  return Object.keys(hardwareRoot)
    .filter((category) => category.startsWith(COLOR_SENSOR_CATEGORY))
    .sort()
    .flatMap((category) => parseCategory(hardwareRoot[category]));
}
