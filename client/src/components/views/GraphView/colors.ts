import twColors from 'tailwindcss/colors';

// Handed out to new lines in order. Short and high-contrast, so a handful of
// lines reads without manual picking.
export const DEFAULT_SERIES_COLORS = [
  twColors['blue']['600'],
  twColors['red']['600'],
  twColors['green']['600'],
  twColors['purple']['600'],
  twColors['orange']['600'],
  twColors['pink']['600'],
];

const SWATCH_HUES = [
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
] as const;

// The lighter shade reads better on the dark theme, the darker on light.
const SWATCH_SHADES = ['400', '600'] as const;

// Shade-major, so the picker renders as two bands rather than alternating.
export const SWATCH_COLORS = SWATCH_SHADES.flatMap((shade) =>
  SWATCH_HUES.map((hue) => twColors[hue][shade]),
);

const HEX_COLOR_REGEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

// Hex only, so manual entry stays interchangeable with <input type="color">.
export function normalizeHexColor(raw: string): string | null {
  const match = HEX_COLOR_REGEX.exec(raw.trim());
  if (match === null) return null;

  const digits = match[1].toLowerCase();
  const expanded =
    digits.length === 3
      ? digits
          .split('')
          .map((c) => c + c)
          .join('')
      : digits;

  return `#${expanded}`;
}

export function sameColor(a: string, b: string) {
  return (normalizeHexColor(a) ?? a) === (normalizeHexColor(b) ?? b);
}

export function pickDefaultColor(usedColors: string[]) {
  const unused = DEFAULT_SERIES_COLORS.find(
    (color) => !usedColors.some((used) => sameColor(used, color)),
  );

  return (
    unused ??
    DEFAULT_SERIES_COLORS[usedColors.length % DEFAULT_SERIES_COLORS.length]
  );
}
