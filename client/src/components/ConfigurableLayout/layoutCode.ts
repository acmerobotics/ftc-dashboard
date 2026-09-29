import { ConfigurableView } from '@/enums/ConfigurableView';

// Layout codes look like `v1;field:0,0,4,9;graph:4,0,4,9`. Each item is
// `<view>:<x>,<y>,<w>,<h>`. Keys are stable across enum reorderings.
const CODE_VERSION = 'v1';
const ITEM_SEPARATOR = ';';
const URL_PARAM = 'layout';
const MAX_CODE_LENGTH = 4096;
const MAX_ITEMS = 64;
// Views like the field redraw a canvas of their own size on every telemetry
// packet, so shared layouts are bounded. The tallest default covers 216 cells.
const MAX_VIEW_ROWS = 100;
const MAX_GRID_ROWS = 300;
const MAX_CELLS = 3600;

// Keys come from enum names, so a view added later gets one without an edit
// here: HARDWARE_CONFIG_VIEW is "hardwareconfig".
const viewKey = (view: ConfigurableView) =>
  ConfigurableView[view]
    .replace(/_VIEW$/, '')
    .replace(/_/g, '')
    .toLowerCase();

const VIEWS_BY_KEY = new Map(
  Object.values(ConfigurableView)
    .filter((value): value is ConfigurableView => typeof value === 'number')
    .map((view) => [viewKey(view), view]),
);

export type SharedGridItem = {
  view: ConfigurableView;
  x: number;
  y: number;
  w: number;
  h: number;
};

type GridLimits = {
  cols: number;
  minW: number;
};

type DecodeResult =
  | { ok: true; items: SharedGridItem[] }
  | { ok: false; error: string };

export function encodeLayout(items: SharedGridItem[]): string {
  return [
    CODE_VERSION,
    ...items.map(
      (item) => `${viewKey(item.view)}:${item.x},${item.y},${item.w},${item.h}`,
    ),
  ].join(ITEM_SEPARATOR);
}

function parseInteger(text: string): number | null {
  return /^\d{1,4}$/.test(text) ? Number(text) : null;
}

function quote(text: string): string {
  return `"${text.length > 40 ? `${text.slice(0, 40)}...` : text}"`;
}

function malformed(segment: string): DecodeResult {
  return { ok: false, error: `Malformed entry ${quote(segment)}.` };
}

export function decodeLayout(code: string, limits: GridLimits): DecodeResult {
  if (code.length > MAX_CODE_LENGTH) {
    return { ok: false, error: 'This is too long to be a layout code.' };
  }

  const segments = extractLayoutCode(code)
    .split(ITEM_SEPARATOR)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (segments.length === 0) {
    return { ok: false, error: 'Paste a layout code or link.' };
  }
  const version = segments[0].toLowerCase();
  if (version !== CODE_VERSION) {
    return {
      ok: false,
      error: /^v\d+$/.test(version)
        ? 'This code is from a newer dashboard.'
        : 'Not a layout code.',
    };
  }

  const itemSegments = segments.slice(1);
  if (itemSegments.length === 0) {
    return { ok: false, error: 'The layout code has no views.' };
  }
  if (itemSegments.length > MAX_ITEMS) {
    return { ok: false, error: `Layouts are limited to ${MAX_ITEMS} views.` };
  }

  const items: SharedGridItem[] = [];
  let cells = 0;
  for (const segment of itemSegments) {
    const [name, rect, ...rest] = segment.split(':');
    const key = name.trim().toLowerCase();
    const view = VIEWS_BY_KEY.get(key);
    if (view === undefined) {
      return {
        ok: false,
        error: `Unknown view ${quote(key)}, perhaps from a newer dashboard.`,
      };
    }
    if (rect === undefined || rest.length > 0) {
      return malformed(segment);
    }

    const numbers = rect.split(',').map((n) => parseInteger(n.trim()));
    if (numbers.length !== 4 || numbers.some((n) => n === null)) {
      return malformed(segment);
    }
    const [x, y, w, h] = numbers as number[];

    if (w < limits.minW) {
      return {
        ok: false,
        error: `"${key}" is narrower than ${limits.minW} columns.`,
      };
    }
    if (x + w > limits.cols) {
      return { ok: false, error: `"${key}" does not fit in the grid.` };
    }
    if (h < 1) {
      return { ok: false, error: `"${key}" has an invalid height.` };
    }
    if (h > MAX_VIEW_ROWS) {
      return {
        ok: false,
        error: `"${key}" is taller than ${MAX_VIEW_ROWS} rows.`,
      };
    }
    if (y + h > MAX_GRID_ROWS) {
      return { ok: false, error: `"${key}" is too far down the grid.` };
    }

    cells += w * h;
    items.push({ view, x, y, w, h });
  }

  if (cells > MAX_CELLS) {
    return {
      ok: false,
      error: `The views cover more than ${MAX_CELLS} grid cells.`,
    };
  }

  return { ok: true, items };
}

function safeDecodeURIComponent(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

const isAlphanumeric = (c: string) => /[a-z0-9]/i.test(c);

// Accepts a bare code or a full link and returns the code. Quotes and
// punctuation that chat apps wrap around links are dropped.
function extractLayoutCode(text: string): string {
  const decoded = safeDecodeURIComponent(text.trim());
  const match = new RegExp(`(?:^|[#?&])${URL_PARAM}=([^&\\s]+)`).exec(decoded);
  const code = match ? match[1] : decoded;
  let start = 0;
  let end = code.length;
  while (start < end && !isAlphanumeric(code[start])) start++;
  while (end > start && !isAlphanumeric(code[end - 1])) end--;
  return code.slice(start, end);
}

export function buildLayoutLink(code: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#${URL_PARAM}=${code}`;
}

export function readLayoutCodeFromUrl(): string | null {
  const match = new RegExp(`[#&]${URL_PARAM}=([^&]+)`).exec(
    window.location.hash,
  );
  return match ? safeDecodeURIComponent(match[1]) : null;
}

export function clearLayoutCodeFromUrl() {
  const { pathname, search, hash } = window.location;
  const params = hash
    .replace(/^#/, '')
    .split('&')
    .filter((p) => p.length > 0);
  const kept = params.filter((p) => !p.startsWith(`${URL_PARAM}=`));
  if (kept.length === params.length) return;
  const newHash = kept.length > 0 ? `#${kept.join('&')}` : '';
  window.history.replaceState(null, '', pathname + search + newHash);
}
