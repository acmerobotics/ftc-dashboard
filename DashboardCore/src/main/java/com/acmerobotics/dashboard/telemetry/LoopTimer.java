package com.acmerobotics.dashboard.telemetry;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.LongSupplier;

/**
 * Times each part of an op mode loop and reports it as telemetry the dashboard's Loop Time view
 * charts. Milliseconds under {@code <prefix>/<segment>} and {@code <prefix>/total} are means over
 * the loops since the last report; {@code <prefix>/worst} is the longest single loop. Segments are
 * sequential, not nested. Usage is in docs/features.md; drive a timer from one thread.
 */
public class LoopTimer {
    public static final String TOTAL_KEY = "total";

    public static final String WORST_KEY = "worst";

    private static final double NANOS_PER_MILLI = 1e6;

    private final String prefix;
    private final LongSupplier clock;

    private final Map<String, Long> windowNanos = new LinkedHashMap<>();

    private final Map<String, Long> iterationNanos = new LinkedHashMap<>();

    private String openSegment;
    private long openSegmentStart;

    private long loopStart;
    private boolean loopOpen;

    private int loopCount;
    private long windowTotalNanos;
    private long worstLoopNanos;

    public LoopTimer() {
        this("loop");
    }

    public LoopTimer(String prefix) {
        this(prefix, System::nanoTime);
    }

    public LoopTimer(String prefix, LongSupplier clock) {
        this.prefix = prefix;
        this.clock = clock;
    }

    /** Discards the previous iteration whole, segments included, if it never reached endLoop. */
    public void startLoop() {
        openSegment = null;
        iterationNanos.clear();
        loopStart = clock.getAsLong();
        loopOpen = true;
    }

    /**
     * Closes the segment being timed and starts a new one. Re-using a name within an iteration adds
     * to that segment; the names addTo writes itself, "total" and "worst", are rejected.
     */
    public void beginSegment(String name) {
        if (TOTAL_KEY.equals(name) || WORST_KEY.equals(name)) {
            throw new IllegalArgumentException("reserved segment name: " + name);
        }

        if (!loopOpen) {
            startLoop();
        }

        closeOpenSegment();

        openSegment = name;
        openSegmentStart = clock.getAsLong();
    }

    public void endSegment() {
        closeOpenSegment();
    }

    public void endLoop() {
        if (!loopOpen) {
            return;
        }

        closeOpenSegment();

        for (Map.Entry<String, Long> entry : iterationNanos.entrySet()) {
            Long previous = windowNanos.get(entry.getKey());
            windowNanos.put(
                    entry.getKey(),
                    previous == null ? entry.getValue() : previous + entry.getValue());
        }
        iterationNanos.clear();

        long elapsed = clock.getAsLong() - loopStart;
        windowTotalNanos += elapsed;
        worstLoopNanos = Math.max(worstLoopNanos, elapsed);
        loopCount++;
        loopOpen = false;
    }

    public Segment segment(String name) {
        beginSegment(name);
        return new Segment(name);
    }

    /** Writes the breakdown into the packet and starts a fresh window, closing any open loop. */
    public void addTo(TelemetryPacket packet) {
        endLoop();

        if (loopCount == 0) {
            return;
        }

        for (Map.Entry<String, Long> entry : windowNanos.entrySet()) {
            packet.put(prefix + "/" + entry.getKey(), millisPerLoop(entry.getValue()));
        }
        packet.put(prefix + "/" + TOTAL_KEY, millisPerLoop(windowTotalNanos));
        packet.put(prefix + "/" + WORST_KEY, worstLoopNanos / NANOS_PER_MILLI);

        reset();
    }

    public double getMeanLoopMillis() {
        return loopCount == 0 ? 0 : millisPerLoop(windowTotalNanos);
    }

    public double getWorstLoopMillis() {
        return worstLoopNanos / NANOS_PER_MILLI;
    }

    public int getLoopCount() {
        return loopCount;
    }

    /** Discards the current window and any iteration under way, without reporting either. */
    public void reset() {
        windowNanos.clear();
        iterationNanos.clear();
        windowTotalNanos = 0;
        worstLoopNanos = 0;
        loopCount = 0;
        openSegment = null;
        loopOpen = false;
    }

    private double millisPerLoop(long nanos) {
        return nanos / NANOS_PER_MILLI / loopCount;
    }

    private void closeOpenSegment() {
        if (openSegment == null) {
            return;
        }

        long elapsed = clock.getAsLong() - openSegmentStart;
        Long previous = iterationNanos.get(openSegment);
        iterationNanos.put(openSegment, previous == null ? elapsed : previous + elapsed);

        openSegment = null;
    }

    public class Segment implements AutoCloseable {
        private final String name;

        private Segment(String name) {
            this.name = name;
        }

        @Override
        public void close() {
            if (name.equals(openSegment)) {
                endSegment();
            }
        }
    }
}
