package com.acmerobotics.dashboard;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.acmerobotics.dashboard.telemetry.LoopTimer;
import com.acmerobotics.dashboard.telemetry.TelemetryPacket;
import com.google.gson.JsonObject;
import org.junit.jupiter.api.Test;

public class LoopTimerTest {
    private long nanos;
    private final LoopTimer timer = new LoopTimer("auto", () -> nanos);

    private void advance(long millis) {
        nanos += millis * 1_000_000L;
    }

    /** TelemetryPacket exposes its data only through serialization. */
    private JsonObject report() {
        TelemetryPacket packet = new TelemetryPacket(false);
        timer.addTo(packet);
        return DashboardCore.GSON.toJsonTree(packet).getAsJsonObject().getAsJsonObject("data");
    }

    private static void assertMillis(double expected, JsonObject data, String key) {
        double actual = Double.parseDouble(data.get("auto/" + key).getAsString());
        assertEquals(expected, actual, 1e-6, key);
    }

    private void loopOf(long millis) {
        timer.startLoop();
        timer.beginSegment("work");
        advance(millis);
        timer.endLoop();
    }

    @Test
    public void splitsOneLoopIntoSegmentsAndTheWholeLoop() {
        timer.startLoop();
        advance(3);
        timer.beginSegment("io");
        advance(3);
        timer.beginSegment("compute");
        advance(1);
        timer.beginSegment("io");
        advance(4);
        timer.endSegment();
        advance(5);
        timer.endLoop();

        JsonObject data = report();
        assertMillis(7, data, "io");
        assertMillis(1, data, "compute");
        assertMillis(16, data, "total");
    }

    @Test
    public void reportsTheMeanAndWorstSinceTheLastReport() {
        loopOf(10);
        loopOf(30);
        loopOf(20);
        assertEquals(3, timer.getLoopCount());
        assertEquals(20.0, timer.getMeanLoopMillis(), 1e-6);
        assertEquals(30.0, timer.getWorstLoopMillis(), 1e-6);

        JsonObject data = report();
        assertMillis(20, data, "work");
        assertMillis(20, data, "total");
        assertMillis(30, data, "worst");
        assertEquals(0, report().size());

        loopOf(5);
        data = report();
        assertMillis(5, data, "work");
        assertMillis(5, data, "total");
        assertMillis(5, data, "worst");
    }

    @Test
    public void dropsAnAbandonedLoopAndReportClosesAnOpenOne() {
        timer.startLoop();
        timer.beginSegment("sensors");
        advance(2);
        timer.beginSegment("vision");
        advance(6);

        timer.startLoop();
        timer.beginSegment("sensors");
        advance(2);

        JsonObject data = report();
        assertMillis(2, data, "sensors");
        assertMillis(2, data, "total");
        assertFalse(data.has("auto/vision"));
    }

    @Test
    public void tryWithResourcesEndsTheSegmentWithTheBlock() {
        timer.startLoop();
        try (LoopTimer.Segment segment = timer.segment("vision")) {
            advance(6);
        }
        advance(4);
        timer.endLoop();

        assertMillis(6, report(), "vision");
    }

    @Test
    public void rejectsTheNamesItWritesItself() {
        assertThrows(IllegalArgumentException.class, () -> timer.beginSegment("total"));
        assertThrows(IllegalArgumentException.class, () -> timer.beginSegment("worst"));
        assertThrows(IllegalArgumentException.class, () -> timer.segment("total"));
    }
}
