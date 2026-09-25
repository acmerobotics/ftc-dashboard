import React, { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';

import OpModeStatus from '@/enums/OpModeStatus';
import type { Marker, StatusSample } from '@/store/recording/format';
import { formatClock, formatClockShort } from '@/store/recording/timeFormat';
import { MUTED_TEXT, SMALL_BUTTON } from './controlStyles';

const SPEEDS = [0.25, 0.5, 1, 2, 4];
const MAX_TICKS = 6;
const MIN_SPAN_PCT = 0.25;

type TransportBarProps = {
  cursorMs: number;
  durationMs: number;
  isPlaying: boolean;
  speed: number;
  loop: boolean;
  markers: Marker[];
  statusTimeline: StatusSample[];
  density: number[];
  onSeek: (t: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onSetSpeed: (speed: number) => void;
  onSetLoop: (loop: boolean) => void;
  onStep: (deltaMs: number) => void;
  /** Compare mode, where the cursor tracks the live run. Speed and loop are
   *  meaningless there: the recording is pinned to real time. */
  followsLive?: boolean;
  /** Lined up on the live run now, rather than moved off it or waiting. */
  following?: boolean;
};

function pct(t: number, durationMs: number) {
  if (durationMs <= 0) return 0;
  return Math.max(0, Math.min(100, (t / durationMs) * 100));
}

/** Hard-bounded, not derived from the duration alone: an imported recording
 *  can carry a non-finite one, and the loop then pins the main thread. */
function rulerTicks(durationMs: number): number[] {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return [0];

  const candidates = [1000, 2000, 5000, 10000, 15000, 30000, 60000, 120000];
  const interval =
    candidates.find((c) => durationMs / c <= MAX_TICKS) ??
    Math.ceil(durationMs / MAX_TICKS);

  const ticks: number[] = [];
  for (
    let t = 0;
    t <= durationMs && ticks.length < MAX_TICKS + 1;
    t += interval
  ) {
    ticks.push(t);
  }
  return ticks;
}

const Track = ({
  cursorMs,
  durationMs,
  markers,
  statusTimeline,
  density,
  onSeek,
}: {
  cursorMs: number;
  durationMs: number;
  markers: Marker[];
  statusTimeline: StatusSample[];
  density: number[];
  onSeek: (t: number) => void;
}) => {
  // One span per RUN of identical status, not per sample: the recorder samples
  // once a second, so a ten-minute match would be 600 positioned nodes
  // reconciled on every cursor tick.
  const spans = useMemo(() => {
    const runs: {
      left: number;
      width: number;
      state: string | undefined;
      lowBattery: number | null;
      highBattery: number | null;
      t: number;
      end: number;
    }[] = [];

    statusTimeline.forEach(([t, status], i) => {
      const end = statusTimeline[i + 1]?.[0] ?? durationMs;
      const volts =
        typeof status.batteryVoltage === 'number' && status.batteryVoltage > 0
          ? status.batteryVoltage
          : null;
      const open = runs[runs.length - 1];

      // A span under MIN_SPAN_PCT is not visible on its own, and an imported
      // file can alternate states on every one of its samples.
      if (
        open &&
        (open.state === status.activeOpModeStatus || open.width < MIN_SPAN_PCT)
      ) {
        // The range, not the span's first sample: sag is what is worth reading.
        open.end = end;
        open.width = pct(end - open.t, durationMs);
        if (volts !== null) {
          open.lowBattery =
            open.lowBattery === null ? volts : Math.min(open.lowBattery, volts);
          open.highBattery =
            open.highBattery === null
              ? volts
              : Math.max(open.highBattery, volts);
        }
        return;
      }

      runs.push({
        left: pct(t, durationMs),
        width: pct(end - t, durationMs),
        state: status.activeOpModeStatus,
        lowBattery: volts,
        highBattery: volts,
        t,
        end,
      });
    });

    return runs;
  }, [statusTimeline, durationMs]);

  const peak = Math.max(1, ...density);

  return (
    <div className="relative h-9">
      <div
        className="absolute inset-x-0 top-0 flex h-9 items-end gap-px overflow-hidden rounded bg-gray-100 dark:bg-slate-800"
        title="Bar height is how much data arrived"
      >
        {density.map((d, i) => (
          <div
            key={i}
            className="flex-1 bg-gray-200 dark:bg-slate-700"
            style={{ height: `${Math.max(6, (d / peak) * 100)}%` }}
          />
        ))}
      </div>

      {/* z-10, as for the markers: this title is the only place the battery
          voltage at a moment is readable. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-1 overflow-hidden rounded-t">
        {spans.map((s, i) => (
          <div
            key={i}
            className={clsx(
              'pointer-events-auto absolute top-0 h-full',
              s.state === OpModeStatus.RUNNING && 'bg-primary-500',
              s.state === OpModeStatus.INIT && 'bg-amber-400',
              s.state === OpModeStatus.STOPPED &&
                'bg-gray-400 dark:bg-slate-500',
            )}
            style={{ left: `${s.left}%`, width: `${Math.max(s.width, 0.4)}%` }}
            title={`${formatClock(s.t)} ${s.state ?? ''}${batteryLabel(s)}`}
          />
        ))}
      </div>

      <div
        className="pointer-events-none absolute top-0 h-9 rounded-l bg-primary-500/20"
        style={{ width: `${pct(cursorMs, durationMs)}%` }}
      />
      <div
        className="pointer-events-none absolute top-0 h-9 w-0.5 bg-primary-600 dark:bg-primary-400"
        style={{ left: `${pct(cursorMs, durationMs)}%` }}
      />

      {/* Above the scrub surface and swallowing its own pointerdown, so a click
          jumps to the marker instead of scrubbing; the title is the only place a
          marker's text is rendered anywhere in the app. */}
      {markers.map((m, i) => (
        <button
          key={i}
          className={clsx(
            'absolute bottom-0 z-10 h-2 w-1 -translate-x-1/2 rounded-sm',
            m.kind === 'error' ? 'bg-red-500' : 'bg-gray-400 dark:bg-slate-400',
          )}
          style={{ left: `${pct(m.t, durationMs)}%` }}
          title={`${formatClock(m.t)}  ${m.text}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onSeek(m.t)}
        />
      ))}
    </div>
  );
};

function batteryLabel(span: {
  lowBattery: number | null;
  highBattery: number | null;
}): string {
  const { lowBattery, highBattery } = span;
  if (lowBattery === null || highBattery === null) return '';
  if (Math.abs(highBattery - lowBattery) < 0.05) {
    return ` at ${highBattery.toFixed(2)}V`;
  }
  return ` at ${highBattery.toFixed(2)}V down to ${lowBattery.toFixed(2)}V`;
}

const Swatch = ({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) => (
  <span className="flex items-center gap-1">
    <span className={clsx('inline-block h-2 w-2 rounded-sm', className)} />
    {children}
  </span>
);

const TransportBar = ({
  cursorMs,
  durationMs,
  isPlaying,
  speed,
  loop,
  markers,
  statusTimeline,
  density,
  onSeek,
  onPlay,
  onPause,
  onSetSpeed,
  onSetLoop,
  onStep,
  followsLive = false,
  following = false,
}: TransportBarProps) => {
  const ticks = useMemo(() => rulerTicks(durationMs), [durationMs]);

  // Local state owns the value while dragging, or the cursor tick slides the
  // playhead away from a still finger. Keys skip it: no pointer-up clears it.
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [dragMs, setDragMs] = useState<number | null>(null);
  const shownMs = dragMs ?? cursorMs;

  // A seek re-sends seconds of history to every view, and pointer events can
  // outpace frames, so a drag seeks once a frame at most, and at release.
  const pendingSeek = useRef<number | null>(null);
  const seekFrame = useRef(0);
  const flushSeek = () => {
    cancelAnimationFrame(seekFrame.current);
    seekFrame.current = 0;
    const t = pendingSeek.current;
    pendingSeek.current = null;
    if (t !== null) onSeek(t);
  };
  const seekNextFrame = (t: number) => {
    pendingSeek.current = t;
    if (seekFrame.current === 0) {
      seekFrame.current = requestAnimationFrame(flushSeek);
    }
  };
  useEffect(() => () => cancelAnimationFrame(seekFrame.current), []);

  const endDrag = () => {
    flushSeek();
    dragging.current = false;
    setDragMs(null);
  };

  // Linear across the whole track width, the mapping the playhead, markers and
  // ruler use. A native range input insets the thumb by half its width, so
  // pointer and playhead would agree only at the midpoint and the ends.
  const msAt = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return null;

    const r = el.getBoundingClientRect();
    if (r.width <= 0) return null;

    // No duration means the recording is still decoding; 0 would read as a
    // deliberate seek to the start rather than as no seek at all.
    if (!(durationMs > 0)) return null;

    const frac = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    return frac * durationMs;
  };

  const step = (deltaMs: number) =>
    onSeek(Math.max(0, Math.min(durationMs, cursorMs + deltaMs)));

  return (
    <div>
      <div
        ref={trackRef}
        className="relative cursor-pointer"
        role="slider"
        tabIndex={0}
        aria-label="Position in recording"
        aria-valuemin={0}
        aria-valuemax={Math.max(durationMs, 0)}
        aria-valuenow={Math.round(shownMs)}
        aria-valuetext={formatClock(shownMs)}
        onPointerDown={(e) => {
          if (e.button !== 0) return;

          const t = msAt(e.clientX);
          if (t === null) return;

          dragging.current = true;
          setDragMs(t);
          onSeek(t);

          // Capture only keeps the drag alive off the track, and throws if the
          // pointer is already gone, as after a fast tap or a synthetic event.
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // onPointerUp on the element still ends the drag.
          }
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;

          const t = msAt(e.clientX);
          if (t === null) return;

          setDragMs(t);
          seekNextFrame(t);
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onKeyDown={(e) => {
          // Marker buttons are children, so without this a Space on a focused
          // marker bubbles here and is preventDefault()'d before activating.
          if (e.target !== e.currentTarget) return;

          const d = e.shiftKey ? 1000 : 100;
          switch (e.key) {
            case ' ':
              // The tile's shortcuts need the tile to be the target, and
              // the track takes focus on click.
              e.preventDefault();
              if (isPlaying) onPause();
              else onPlay();
              break;
            case 'ArrowLeft':
              e.preventDefault();
              step(-d);
              break;
            case 'ArrowRight':
              e.preventDefault();
              step(d);
              break;
            case 'Home':
              e.preventDefault();
              onSeek(0);
              break;
            case 'End':
              e.preventDefault();
              onSeek(durationMs);
              break;
            default:
              break;
          }
        }}
      >
        <Track
          cursorMs={shownMs}
          durationMs={durationMs}
          markers={markers}
          statusTimeline={statusTimeline}
          density={density}
          onSeek={onSeek}
        />
      </div>

      {/* Positioned, not justify-between: ticks land on round times, which do
          not divide the duration evenly; even spacing would mislabel them. */}
      <div className="relative mt-0.5 h-4 text-xs text-gray-500 dark:text-slate-400">
        {ticks.map((t) => (
          <span
            key={t}
            className="absolute -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${pct(t, durationMs)}%` }}
          >
            {formatClockShort(t)}
          </span>
        ))}
      </div>

      <div
        className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${MUTED_TEXT}`}
      >
        {statusTimeline.length > 0 && (
          <>
            <Swatch className="bg-amber-400">Init</Swatch>
            <Swatch className="bg-primary-500">Running</Swatch>
            <Swatch className="bg-gray-400 dark:bg-slate-500">Stopped</Swatch>
          </>
        )}
        {markers.some((m) => m.kind !== 'error') && (
          <Swatch className="bg-gray-400 dark:bg-slate-400">Event</Swatch>
        )}
        {markers.some((m) => m.kind === 'error') && (
          <Swatch className="bg-red-500">Error</Swatch>
        )}
        {markers.length > 0 && <span>click a marker to jump to it</span>}
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-2">
        <button
          className="w-20 rounded bg-primary-600 py-1 text-sm font-medium text-white transition hover:bg-primary-700"
          onClick={isPlaying ? onPause : onPlay}
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          className={SMALL_BUTTON}
          onClick={() => onStep(-1000)}
          title="Back one second"
        >
          -1s
        </button>
        <button
          className={SMALL_BUTTON}
          onClick={() => onStep(1000)}
          title="Forward one second"
        >
          +1s
        </button>

        <span className="font-mono text-sm tabular-nums">
          {formatClock(shownMs)}
          <span className="text-gray-500 dark:text-slate-400">
            {' / '}
            {formatClock(durationMs)}
          </span>
        </span>

        <span className="ml-auto flex items-center gap-2 text-xs">
          {followsLive ? (
            following && (
              <span className="text-gray-500 dark:text-slate-400">
                Following the live run
              </span>
            )
          ) : (
            <>
              <label className="flex items-center gap-1">
                <span className="text-gray-500 dark:text-slate-400">Speed</span>
                <select
                  className="rounded border-gray-300 py-0.5 pl-1 pr-6 text-xs dark:border-slate-600 dark:bg-slate-800"
                  value={speed}
                  onChange={(e) => onSetSpeed(Number(e.target.value))}
                >
                  {SPEEDS.map((s) => (
                    <option key={s} value={s}>
                      {s}x
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  className="rounded text-primary-600"
                  checked={loop}
                  onChange={(e) => onSetLoop(e.target.checked)}
                />
                Loop
              </label>
            </>
          )}
        </span>
      </div>
    </div>
  );
};

export default TransportBar;
