import type { PlaybackState } from '@/store/types/playback';
import type { DrawOp } from '@/store/types/telemetry';

/** The open recording takes the first; the length caps how many are drawn. */
export const GHOST_COLOURS = [
  '#f59e0b',
  '#d946ef',
  '#84cc16',
  '#f97316',
  '#0ea5e9',
  '#f43f5e',
  '#8b5cf6',
  '#10b981',
];

/** Undoes what Field.js carries across ops: transforms, fill and stroke. */
export const GHOST_RESET: DrawOp[] = [
  { type: 'alpha', alpha: 1 },
  { type: 'translate', x: 0, y: 0 },
  { type: 'rotation', rotation: 0 },
  { type: 'scale', scaleX: 1, scaleY: 1 },
  { type: 'fill', color: '#000' },
  { type: 'stroke', color: '#000' },
  { type: 'strokeWidth', width: 1 },
];

/** The selected recordings compare mode draws besides the open one. Those in
 *  `skip` cannot be lined up, so take no place under the cap. */
export function overlayIds(
  playback: PlaybackState,
  skip: ReadonlySet<string>,
): string[] {
  if (playback.mode !== 'ghost' || playback.recordingId === null) return [];

  const { recorder } = playback;
  const recording = recorder.active ? recorder.id : null;
  return playback.selectedIds
    .filter(
      (id) => id !== playback.recordingId && id !== recording && !skip.has(id),
    )
    .slice(0, GHOST_COLOURS.length - 1);
}

export function tint(ops: DrawOp[], colour: string): DrawOp[] {
  return ops.map((op) =>
    op.type === 'fill' || op.type === 'stroke' ? { ...op, color: colour } : op,
  );
}
