import { hexToRgb } from './colorUtils';

export type ExpectedColor = {
  /** Expected color as `#rrggbb`. */
  hex: string;
  /** Largest CIEDE2000 difference still counted as a match. */
  tolerance: number;
};

export type ColorPreset = {
  label: string;
  hex: string;
};

export const EXPECTED_COLOR_STORAGE_KEY = 'colorViewExpected';
export const SETTINGS_STORAGE_KEY = 'colorViewSettings';

export const MIN_TOLERANCE = 0;
export const MAX_TOLERANCE = 100;
export const MIN_DIVISOR = 1;

export const DEFAULT_EXPECTED: ExpectedColor = {
  hex: '#E02020',
  tolerance: 15,
};

export const COLOR_PRESETS: ColorPreset[] = [
  { label: 'Red', hex: '#E02020' },
  { label: 'Orange', hex: '#F2994A' },
  { label: 'Yellow', hex: '#F2C230' },
  { label: 'Green', hex: '#22B24C' },
  { label: 'Blue', hex: '#1F6FEB' },
  { label: 'Purple', hex: '#7A3FD1' },
  { label: 'White', hex: '#FFFFFF' },
  { label: 'Black', hex: '#000000' },
];

/** localStorage is user-writable, so every field is re-validated. */
export function sanitizeExpected(raw: unknown): ExpectedColor {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_EXPECTED;

  const { hex, tolerance } = raw as Record<string, unknown>;

  return {
    hex:
      typeof hex === 'string' && hexToRgb(hex) !== null
        ? hex
        : DEFAULT_EXPECTED.hex,
    tolerance:
      typeof tolerance === 'number' && Number.isFinite(tolerance)
        ? Math.min(MAX_TOLERANCE, Math.max(MIN_TOLERANCE, tolerance))
        : DEFAULT_EXPECTED.tolerance,
  };
}
