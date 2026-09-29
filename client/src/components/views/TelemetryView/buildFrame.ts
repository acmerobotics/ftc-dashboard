import {
  Telemetry,
  TelemetryDisplayFormat,
  TelemetryEntry,
  TelemetryItem,
} from '@/store/types/telemetry';

/** The format travels with the line; sources need not agree. */
export type DisplayedLine = TelemetryEntry & {
  displayFormat: TelemetryDisplayFormat;
  separator: string;
};

export const DEFAULT_SEPARATOR = ': ';

export type Frame = {
  entries: DisplayedLine[];
  log: DisplayedLine[];
};

function entriesOf(packet: TelemetryItem): DisplayedLine[] {
  // Older robots have no items or format and rendered markup unconditionally.
  const displayFormat = packet.displayFormat ?? 'HTML';
  const separator = packet.captionValueSeparator ?? DEFAULT_SEPARATOR;

  if (Array.isArray(packet.items)) {
    return packet.items
      .filter(
        (item): item is TelemetryEntry =>
          typeof item === 'object' && item !== null,
      )
      .map((item) => ({
        caption: typeof item.caption === 'string' ? item.caption : null,
        value: typeof item.value === 'string' ? item.value : '',
        displayFormat,
        separator,
      }));
  }

  return Object.keys(packet.data ?? {}).map((caption) => ({
    caption,
    value: packet.data[caption],
    displayFormat,
    separator,
  }));
}

// Matched by caption and occurrence, so a caption repeated in one packet stays a line of its own.
function slotsOf(entries: DisplayedLine[]): (string | null)[] {
  const occurrences = new Map<string, number>();
  return entries.map(({ caption }) => {
    if (caption == null) return null;
    const occurrence = occurrences.get(caption) ?? 0;
    occurrences.set(caption, occurrence + 1);
    return JSON.stringify([caption, occurrence]);
  });
}

/**
 * Packets are grouped by shape (their captions) so repeats of one loop collapse onto the newest
 * while different sources sit side by side. Grouping on shape is what lets bare lines survive.
 */
export default function buildFrame(packets: Telemetry): Frame | null {
  // A pruned drawing-only packet looks empty, so empty counts only if declared telemetry.
  const contributes = (packet: TelemetryItem, entries: TelemetryEntry[]) =>
    entries.length > 0 ||
    (Array.isArray(packet.log) && packet.log.length > 0) ||
    packet.telemetryFrame === true;

  const frames = packets
    .map((packet) => ({ packet, entries: entriesOf(packet) }))
    .filter(({ packet, entries }) => contributes(packet, entries));

  // An empty batch is the clear signal; a drawing-only batch says nothing about telemetry.
  if (frames.length === 0)
    return packets.length === 0 ? { entries: [], log: [] } : null;

  const shapes = new Map<string, DisplayedLine[]>();
  const newest = new Map<string, DisplayedLine>();

  const bareCounts = new Map<number, number>();

  for (const { packet, entries } of frames) {
    if (entries.length === 0) continue;

    const captions = entries.map((e) => e.caption).filter((c) => c !== null);

    let key: string;
    if (captions.length > 0) {
      key = JSON.stringify(captions);
    } else if (packet.telemetryFrame === true) {
      key = 'bare:telemetry';
    } else {
      // Packets queued in one loop share a timestamp; a source resending each loop does not.
      const instant =
        typeof packet.timestamp === 'number' ? packet.timestamp : 0;
      const ordinal = bareCounts.get(instant) ?? 0;
      bareCounts.set(instant, ordinal + 1);
      key = `bare:packet:${ordinal}`;
    }

    shapes.set(key, entries);

    slotsOf(entries).forEach((slot, i) => {
      if (slot !== null) newest.set(slot, entries[i]);
    });
  }

  const entries: DisplayedLine[] = [];
  const seen = new Set<string>();

  for (const shape of shapes.values()) {
    const slots = slotsOf(shape);

    // A conditional item splits one frame into two shapes; only the first keeps its bare lines.
    const overlaps = slots.some((slot) => slot !== null && seen.has(slot));

    shape.forEach((entry, i) => {
      const slot = slots[i];
      if (slot === null) {
        if (!overlaps) entries.push(entry);
      } else if (!seen.has(slot)) {
        seen.add(slot);
        entries.push(newest.get(slot) ?? entry);
      }
    });
  }

  // The newest packet that carries a log wins, so an unrelated source cannot blank it.
  const logged = packets.reduce<TelemetryItem | null>(
    (acc, packet) =>
      Array.isArray(packet.log) && packet.log.length > 0 ? packet : acc,
    null,
  );

  const log: DisplayedLine[] = (logged?.log ?? []).map((line) => ({
    caption: null,
    value: typeof line === 'string' ? line : '',
    displayFormat: logged?.displayFormat ?? 'HTML',
    separator: logged?.captionValueSeparator ?? DEFAULT_SEPARATOR,
  }));

  return { entries, log };
}
