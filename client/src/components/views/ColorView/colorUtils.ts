export type RGB = {
  r: number;
  g: number;
  b: number;
};

export type HSV = {
  h: number;
  s: number;
  v: number;
};

type Lab = {
  L: number;
  a: number;
  b: number;
};

const clamp = (x: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, x));

const toRad = (deg: number) => (deg * Math.PI) / 180;

export function clampRgb({ r, g, b }: RGB): RGB {
  return {
    r: clamp(Math.round(r), 0, 255),
    g: clamp(Math.round(g), 0, 255),
    b: clamp(Math.round(b), 0, 255),
  };
}

export function rgbToHex(rgb: RGB): string {
  const { r, g, b } = clampRgb(rgb);
  return `#${[r, g, b]
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}

export function hexToRgb(hex: string): RGB | null {
  const match = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(hex.trim());
  if (match === null) return null;

  const digits = match[1];
  const full =
    digits.length === 3
      ? digits
          .split('')
          .map((c) => c + c)
          .join('')
      : digits;

  const value = parseInt(full, 16);
  return {
    r: (value >> 16) & 0xff,
    g: (value >> 8) & 0xff,
    b: value & 0xff,
  };
}

/**
 * Accepts whatever shorthand someone types for a color: `#rgb`/`#rrggbb`,
 * `rgb(r, g, b)`/`rgba(...)`, or a bare `r, g, b` triple.
 */
export function parseColorInput(input: string): RGB | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;

  const hex = hexToRgb(trimmed);
  if (hex !== null) return hex;

  const rgbFn =
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)$/i.exec(
      trimmed,
    );
  if (rgbFn !== null) {
    return clampRgb({
      r: Number(rgbFn[1]),
      g: Number(rgbFn[2]),
      b: Number(rgbFn[3]),
    });
  }

  const triple = /^(\d+)\s*,\s*(\d+)\s*,\s*(\d+)$/.exec(trimmed);
  if (triple !== null) {
    return clampRgb({
      r: Number(triple[1]),
      g: Number(triple[2]),
      b: Number(triple[3]),
    });
  }

  return null;
}

export function rgbToHsv({ r, g, b }: RGB): HSV {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) {
      h = 60 * (((gn - bn) / delta) % 6);
    } else if (max === gn) {
      h = 60 * ((bn - rn) / delta + 2);
    } else {
      h = 60 * ((rn - gn) / delta + 4);
    }
  }
  if (h < 0) h += 360;

  return {
    h,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

/** Saturation below which a color is white, grey or black rather than a hue. */
const ACHROMATIC_SATURATION = 0.1;

export function isAchromatic(rgb: RGB): boolean {
  return rgbToHsv(rgb).s < ACHROMATIC_SATURATION;
}

function srgbToLinear(channel: number): number {
  const cs = channel / 255;
  return cs <= 0.04045 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

/** sRGB (D65) to CIE L*a*b*. */
function rgbToLab({ r, g, b }: RGB): Lab {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);

  const x = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375;
  const y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175;
  const z = rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041;

  // D65 reference white
  const xn = 0.95047;
  const yn = 1.0;
  const zn = 1.08883;

  const f = (t: number) =>
    t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29;

  const fx = f(x / xn);
  const fy = f(y / yn);
  const fz = f(z / zn);

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function hueDegrees(b: number, aPrime: number): number {
  if (b === 0 && aPrime === 0) return 0;
  const deg = (Math.atan2(b, aPrime) * 180) / Math.PI;
  return deg >= 0 ? deg : deg + 360;
}

/**
 * CIEDE2000 color difference. Roughly, <1 is imperceptible, <5 is a close
 * match, and >10 reads as a clearly different color.
 */
export function deltaE2000(rgb1: RGB, rgb2: RGB): number {
  const { L: L1, a: a1, b: b1 } = rgbToLab(rgb1);
  const { L: L2, a: a2, b: b2 } = rgbToLab(rgb2);

  const c1 = Math.hypot(a1, b1);
  const c2 = Math.hypot(a2, b2);
  const cBar = (c1 + c2) / 2;
  const cBar7 = Math.pow(cBar, 7);
  const g = 0.5 * (1 - Math.sqrt(cBar7 / (cBar7 + Math.pow(25, 7))));

  const a1p = (1 + g) * a1;
  const a2p = (1 + g) * a2;
  const c1p = Math.hypot(a1p, b1);
  const c2p = Math.hypot(a2p, b2);
  const h1p = hueDegrees(b1, a1p);
  const h2p = hueDegrees(b2, a2p);

  const dLp = L2 - L1;
  const dCp = c2p - c1p;

  let dhp = 0;
  if (c1p * c2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(c1p * c2p) * Math.sin(toRad(dhp) / 2);

  const lBarP = (L1 + L2) / 2;
  const cBarP = (c1p + c2p) / 2;

  let hBarP: number;
  if (c1p * c2p === 0) {
    hBarP = h1p + h2p;
  } else if (Math.abs(h1p - h2p) <= 180) {
    hBarP = (h1p + h2p) / 2;
  } else if (h1p + h2p < 360) {
    hBarP = (h1p + h2p + 360) / 2;
  } else {
    hBarP = (h1p + h2p - 360) / 2;
  }

  const t =
    1 -
    0.17 * Math.cos(toRad(hBarP - 30)) +
    0.24 * Math.cos(toRad(2 * hBarP)) +
    0.32 * Math.cos(toRad(3 * hBarP + 6)) -
    0.2 * Math.cos(toRad(4 * hBarP - 63));

  const dTheta = 30 * Math.exp(-Math.pow((hBarP - 275) / 25, 2));
  const cBarP7 = Math.pow(cBarP, 7);
  const rc = 2 * Math.sqrt(cBarP7 / (cBarP7 + Math.pow(25, 7)));

  const sl =
    1 +
    (0.015 * Math.pow(lBarP - 50, 2)) / Math.sqrt(20 + Math.pow(lBarP - 50, 2));
  const sc = 1 + 0.045 * cBarP;
  const sh = 1 + 0.015 * cBarP * t;
  const rt = -Math.sin(toRad(2 * dTheta)) * rc;

  const termL = dLp / sl;
  const termC = dCp / sc;
  const termH = dHp / sh;

  return Math.sqrt(
    termL * termL + termC * termC + termH * termH + rt * termC * termH,
  );
}

/** Smallest angular distance between two hues, in degrees (0-180). */
export function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

export type NormalizationMode = 'auto' | 'byte' | 'alpha' | 'manual';

export const NORMALIZATION_LABELS: Record<NormalizationMode, string> = {
  auto: 'Auto (scale to brightest channel)',
  byte: '8-bit (raw counts as 0-255)',
  alpha: 'Alpha (raw ÷ alpha)',
  manual: 'Manual divisor',
};

/**
 * Color sensors report raw counts on wildly different scales depending on the
 * device and its gain, so the raw triple has to be mapped into 0-255 before it
 * can be shown or compared. `auto` keeps hue and saturation but discards
 * brightness, which is usually what you want when identifying a game element.
 */
export function normalizeToDisplay(
  raw: RGB,
  mode: NormalizationMode,
  options: { alpha?: number | null; divisor?: number } = {},
): RGB {
  const { r, g, b } = raw;

  switch (mode) {
    case 'byte':
      return clampRgb({ r, g, b });
    case 'alpha': {
      const alpha = options.alpha ?? 0;
      if (alpha <= 0) return normalizeToDisplay(raw, 'auto');
      const scale = 255 / alpha;
      return clampRgb({ r: r * scale, g: g * scale, b: b * scale });
    }
    case 'manual': {
      const divisor = options.divisor ?? 0;
      if (divisor <= 0) return clampRgb({ r: 0, g: 0, b: 0 });
      const scale = 255 / divisor;
      return clampRgb({ r: r * scale, g: g * scale, b: b * scale });
    }
    case 'auto':
    default: {
      const max = Math.max(r, g, b);
      if (max <= 0) return { r: 0, g: 0, b: 0 };
      const scale = 255 / max;
      return clampRgb({ r: r * scale, g: g * scale, b: b * scale });
    }
  }
}
