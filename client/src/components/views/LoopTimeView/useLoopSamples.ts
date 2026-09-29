import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import { RootState } from '@/store/reducers';

export type LoopSample = {
  timestamp: number;
  /** Every numeric telemetry value in the packet, still in its source unit. */
  values: Record<string, number>;
};

export const DEFAULT_MAX_SAMPLES = 300;

function numericValues(data: Record<string, string>): Record<string, number> {
  const values: Record<string, number> = {};

  for (const key of Object.keys(data)) {
    const parsed = parseFloat(data[key]);
    if (Number.isFinite(parsed)) values[key] = parsed;
  }

  return values;
}

/**
 * Rolling window of numeric telemetry, built here since each batch replaces
 * the telemetry slice. An empty batch is the server clearing telemetry.
 */
export default function useLoopSamples(
  maxSamples: number = DEFAULT_MAX_SAMPLES,
  paused = false,
): {
  samples: LoopSample[];
  availableKeys: string[];
  reset: () => void;
} {
  const packets = useSelector((state: RootState) => state.telemetry);

  const [samples, setSamples] = useState<LoopSample[]>([]);
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);

  const lastTimestamp = useRef(0);
  const clearedWhilePaused = useRef(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const reset = useCallback(() => {
    lastTimestamp.current = 0;
    setSamples([]);
    setAvailableKeys([]);
  }, []);

  useEffect(() => {
    if (packets.length === 0) {
      if (pausedRef.current) {
        clearedWhilePaused.current = true;
      } else {
        reset();
      }
      return;
    }

    const batch = packets.map((packet) => ({
      timestamp: packet.timestamp,
      values: numericValues(packet.data),
    }));

    // Discovery runs while paused too, so the profile editor stays usable.
    setAvailableKeys((prev) => {
      const seen = new Set(prev);
      let changed = false;

      for (const sample of batch) {
        for (const key of Object.keys(sample.values)) {
          if (seen.has(key)) continue;
          seen.add(key);
          changed = true;
        }
      }

      return changed ? [...seen].sort() : prev;
    });

    if (pausedRef.current) return;

    if (clearedWhilePaused.current) {
      clearedWhilePaused.current = false;
      lastTimestamp.current = 0;
      setSamples([]);
    }

    // Packets carry the robot's wall clock, which a time sync can move back.
    const newest = batch[batch.length - 1].timestamp;
    if (newest < lastTimestamp.current) lastTimestamp.current = 0;

    const fresh = batch.filter(
      (sample) => sample.timestamp > lastTimestamp.current,
    );
    if (fresh.length === 0) return;

    lastTimestamp.current = fresh[fresh.length - 1].timestamp;

    setSamples((prev) => [...prev, ...fresh].slice(-maxSamples));
  }, [packets, maxSamples, reset]);

  return { samples, availableKeys, reset };
}
