import { createElement, Fragment, ReactNode } from 'react';

/**
 * Telemetry is robot-supplied, so the markup is parsed inertly and rebuilt as React elements from
 * the allowlists below, which mirror AOSP's `HtmlToSpannedConverter`. Nothing from the input
 * reaches the DOM as markup.
 */

// Tags Html.fromHtml gives a span to. Rendered, with their children.
const RENDERED_TAGS = new Set([
  'b',
  'strong',
  'i',
  'em',
  'cite',
  'dfn',
  'u',
  's',
  'strike',
  'del',
  'sup',
  'sub',
  'big',
  'small',
  'tt',
  'br',
  'p',
  'div',
  'blockquote',
  'ul',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'font',
  'span',
  'a',
]);

// Dropped with their children; `img` renders only a placeholder on the Driver Station anyway.
const DROPPED_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'applet',
  'frame',
  'frameset',
  'portal',
  'link',
  'meta',
  'base',
  'title',
  'noscript',
  'template',
  'img',
  'svg',
  'math',
]);

// Elements Html.fromHtml renders with a monospace typeface.
const MONOSPACE_TAGS = new Set(['tt']);

const MAX_INPUT_LENGTH = 16384;
const MAX_DEPTH = 32;
const MAX_NODES = 2000;

/** `#rgb`, `#rrggbb` and bare colour names only, which rules out `url(…)` and injection. */
function isSafeColor(value: string): boolean {
  const v = value.trim();
  return (
    /^#[0-9a-fA-F]{3}$/.test(v) ||
    /^#[0-9a-fA-F]{6}$/.test(v) ||
    /^[a-zA-Z]{1,20}$/.test(v)
  );
}

// Color.parseColor's table. Several names differ in CSS; FTC samples use `green`.
const ANDROID_COLORS: Record<string, string> = Object.assign(
  Object.create(null),
  {
    black: '#000000',
    darkgray: '#444444',
    gray: '#888888',
    lightgray: '#cccccc',
    white: '#ffffff',
    red: '#ff0000',
    green: '#00ff00',
    blue: '#0000ff',
    yellow: '#ffff00',
    cyan: '#00ffff',
    magenta: '#ff00ff',
    aqua: '#00ffff',
    fuchsia: '#ff00ff',
    darkgrey: '#444444',
    grey: '#888888',
    lightgrey: '#cccccc',
    lime: '#00ff00',
    maroon: '#800000',
    navy: '#000080',
    olive: '#808000',
    purple: '#800080',
    silver: '#c0c0c0',
    teal: '#008080',
  },
);

function resolveColor(value: string): string | null {
  const v = value.trim();
  if (!isSafeColor(v)) return null;
  return ANDROID_COLORS[v.toLowerCase()] ?? v;
}

type Style = Record<string, string>;

// Html.fromHtml reads `style` on these three tags only and ignores it everywhere else.
const CSS_STYLE_TAGS = new Set(['p', 'span', 'li']);

// text-align comes from startBlockElement instead, which every block element goes through.
const BLOCK_TAGS = new Set([
  'p',
  'div',
  'blockquote',
  'ul',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
]);

/**
 * The properties match the Driver Station; the parsing deliberately does not, since AOSP's greedy
 * regex drops every style on an element when a semicolon lacks a trailing space. Every value is
 * validated; the input string never reaches the style object.
 */
function parseStyle(
  declarations: string,
  readsCss: boolean,
  isBlock: boolean,
): Style {
  const style: Style = {};

  for (const declaration of declarations.split(';')) {
    const separator = declaration.indexOf(':');
    if (separator === -1) continue;

    const property = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim();

    switch (property) {
      case 'color': {
        const color = readsCss ? resolveColor(value) : null;
        if (color !== null) style.color = color;
        break;
      }
      case 'background':
      case 'background-color': {
        const background = readsCss ? resolveColor(value) : null;
        if (background !== null) style.backgroundColor = background;
        break;
      }
      case 'text-decoration':
        if (readsCss && value.toLowerCase() === 'line-through') {
          style.textDecoration = 'line-through';
        }
        break;
      case 'text-align':
        if (
          isBlock &&
          ['start', 'center', 'end'].includes(value.toLowerCase())
        ) {
          style.textAlign = value.toLowerCase();
        }
        break;
      default:
        break;
    }
  }

  return style;
}

/** `<font>` becomes a span with the two attributes Html.fromHtml reads; `size` is ignored. */
function fontStyle(element: Element): Style {
  const style: Style = {};

  const color = element.getAttribute('color');
  const resolved = color === null ? null : resolveColor(color);
  if (resolved !== null) style.color = resolved;

  const face = element.getAttribute('face');
  if (face !== null && /^[A-Za-z0-9 _-]{1,32}$/.test(face)) {
    style.fontFamily = face.trim();
  }

  return style;
}

function elementStyle(tag: string, element: Element): Style {
  if (tag === 'font') return fontStyle(element);

  const style =
    element.hasAttribute('style') &&
    (CSS_STYLE_TAGS.has(tag) || BLOCK_TAGS.has(tag))
      ? parseStyle(
          element.getAttribute('style') ?? '',
          CSS_STYLE_TAGS.has(tag),
          BLOCK_TAGS.has(tag),
        )
      : {};

  if (MONOSPACE_TAGS.has(tag)) style.fontFamily = 'monospace';

  return style;
}

/** Bounds a runaway value, whatever its format, so it cannot bloat the DOM. */
export function truncateTelemetry(text: string): string {
  return text.length > MAX_INPUT_LENGTH
    ? `${text.slice(0, MAX_INPUT_LENGTH)}…`
    : text;
}

export function sanitizeTelemetryHtml(input: string): ReactNode {
  const doc = new DOMParser().parseFromString(
    truncateTelemetry(input),
    'text/html',
  );

  let budget = MAX_NODES;
  let key = 0;

  const convert = (node: Node, depth: number): ReactNode => {
    if (budget <= 0) return null;
    budget -= 1;

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.nodeValue ?? '';
      if (!text.includes('\n')) return text;

      // Done on parsed text: rewriting the string first would corrupt a tag spanning two lines.
      return createElement(
        Fragment,
        { key: (key += 1) },
        ...text
          .split('\n')
          .flatMap((part, i) =>
            i === 0 ? [part] : [createElement('br', { key: (key += 1) }), part],
          ),
      );
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const element = node as Element;
    const tag = element.tagName.toLowerCase();

    if (DROPPED_TAGS.has(tag)) return null;

    const children = convertChildren(element, depth + 1);

    // Unknown tags, and anything past MAX_DEPTH, are unwrapped rather than dropped: text survives.
    if (!RENDERED_TAGS.has(tag) || depth > MAX_DEPTH) {
      return createElement(Fragment, { key: (key += 1) }, ...children);
    }

    if (tag === 'br') return createElement('br', { key: (key += 1) });

    // Never carries the href: the DS's URLSpan is inert too, since it never sets a movement method.
    if (tag === 'a') {
      return createElement(
        'span',
        { key: (key += 1), className: 'telemetry-link' },
        ...children,
      );
    }

    const style = elementStyle(tag, element);
    const props: { key: number; style?: Style } = { key: (key += 1) };
    if (Object.keys(style).length > 0) props.style = style;

    return createElement(tag === 'font' ? 'span' : tag, props, ...children);
  };

  const convertChildren = (parent: Node, depth: number): ReactNode[] => {
    const children: ReactNode[] = [];
    parent.childNodes.forEach((child) => {
      const converted = convert(child, depth);
      if (converted !== null && converted !== undefined)
        children.push(converted);
    });
    return children;
  };

  const children = convertChildren(doc.body, 0);

  // A trailing <br> collapses in a browser but not on the Driver Station, so keep it occupied.
  let deepest: Node | null = doc.body.lastChild;
  while (deepest?.lastChild) deepest = deepest.lastChild;

  if (
    deepest?.nodeType === Node.ELEMENT_NODE &&
    (deepest as Element).tagName.toLowerCase() === 'br'
  ) {
    children.push('\u00a0');
  }

  return createElement(Fragment, null, ...children);
}

export default sanitizeTelemetryHtml;
