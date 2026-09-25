/** Clamped, not propagated, so a bad reading cannot render "NaN:NaN.NaN". */
function safeMs(ms: number): number {
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.floor(ms));
}

export function formatClock(ms: number): string {
  const safe = safeMs(ms);
  const minutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  const tenths = Math.floor((safe % 1000) / 100);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

export function formatClockMs(ms: number): string {
  const safe = safeMs(ms);
  const minutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(
    safe % 1000,
  ).padStart(3, '0')}`;
}

export function formatClockShort(ms: number): string {
  const safe = safeMs(ms);
  const minutes = Math.floor(safe / 60000);
  const seconds = Math.floor((safe % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${Math.floor(bytes)} B`;

  // Bounded: `(1048064 / 1024).toFixed(0)` is "1024", which would read 1024 KB.
  const kb = bytes / 1024;
  if (kb < 1023.5) return `${kb.toFixed(0)} KB`;

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
