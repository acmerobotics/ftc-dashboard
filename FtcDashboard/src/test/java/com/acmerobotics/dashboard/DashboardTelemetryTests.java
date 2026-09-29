package com.acmerobotics.dashboard;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.acmerobotics.dashboard.telemetry.MultipleTelemetry;
import com.acmerobotics.dashboard.telemetry.TelemetryPacket;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.firstinspires.ftc.robotcore.external.Func;
import org.firstinspires.ftc.robotcore.external.Telemetry;
import org.junit.jupiter.api.Test;

/**
 * Exercises the telemetry model against the semantics the SDK's own implementation has, which is
 * what the dashboard is trying to match.
 */
public class DashboardTelemetryTests {
    private final List<TelemetryPacket> sent = new ArrayList<>();
    private final DashboardTelemetry telemetry = recording(sent);
    private final List<TelemetryPacket> sentB = new ArrayList<>();
    private final MultipleTelemetry multiple = new MultipleTelemetry(telemetry, recording(sentB));

    private static DashboardTelemetry recording(List<TelemetryPacket> sent) {
        return new DashboardTelemetry(
                new DashboardTelemetry.Host() {
                    @Override
                    public void sendTelemetryPacket(TelemetryPacket packet) {
                        sent.add(packet);
                    }

                    @Override
                    public int getTelemetryTransmissionInterval() {
                        return 100;
                    }

                    @Override
                    public void setTelemetryTransmissionInterval(int interval) {}
                });
    }

    private static List<String> lastLines(List<TelemetryPacket> sent) {
        List<String> lines = new ArrayList<>();
        for (TelemetryPacket.Item item : sent.get(sent.size() - 1).getItems()) {
            lines.add(
                    item.getCaption() == null
                            ? item.getValue()
                            : item.getCaption() + ": " + item.getValue());
        }
        return lines;
    }

    private List<String> update() {
        telemetry.update();
        return lastLines(sent);
    }

    @Test
    public void itemsAndLinesDisplayInOrderAndARepeatedCaptionEachTime() {
        telemetry.addData("Motor", "fl %.2f", 0.5);
        telemetry.addLine("--- drive ---");
        telemetry.addData("Motor", "fr %.2f", 0.25);

        assertEquals(Arrays.asList("Motor: fl 0.50", "--- drive ---", "Motor: fr 0.25"), update());
        assertEquals("fr 0.25", sent.get(0).getData().get("Motor"));
    }

    @Test
    public void floatingPointValuesAreRoundedForDisplayButNotForTheGraph() {
        telemetry.addData("Heading", 37.51234567);
        telemetry.addData("Power", 1.0f);
        telemetry.addData("producer", () -> 1.23456789);

        assertEquals(
                Arrays.asList("Heading: 37.5123", "Power: 1", "producer: 1.23456789"), update());
        assertEquals("37.51234567", sent.get(0).getData().get("Heading"));

        telemetry.setNumDecimalPlaces(0, 1);
        telemetry.addData("Heading", 37.51234567);
        assertEquals(Arrays.asList("producer: 1.23456789", "Heading: 37.5"), update());
    }

    @Test
    public void lineComposesItsItemsWithTheSdkSeparators() {
        telemetry.addLine("sticks").addData("x", 0.123456).addData("y", "%.2f", -0.25);

        assertEquals(Arrays.asList("sticksx : 0.1235 | y : -0.25"), update());
        assertEquals("0.123456", sent.get(0).getData().get("x"));
        assertEquals("-0.25", sent.get(0).getData().get("y"));
    }

    // A producer that waits on a thread adding data would deadlock if it ran inside the monitor.
    @Test
    public void producersRunOutsideTheMonitor() {
        Func<Boolean> addsFromAnotherThread =
                () -> {
                    Thread adder = new Thread(() -> telemetry.addData("other", 2));
                    adder.start();
                    try {
                        adder.join(5000);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                    return !adder.isAlive();
                };
        telemetry.addData("item", addsFromAnotherThread);
        telemetry.addLine("line ").addData("x", addsFromAnotherThread);

        assertEquals(Arrays.asList("item: true", "line x : true"), update());
    }

    @Test
    public void autoClearCanBeTurnedOff() {
        telemetry.setAutoClear(false);
        telemetry.addData("a", 1);
        update();
        telemetry.addData("b", 2);
        assertEquals(Arrays.asList("a: 1", "b: 2"), update());

        telemetry.setAutoClear(true);
        update();
        telemetry.addData("c", 3);
        assertEquals(Arrays.asList("c: 3"), update());
    }

    @Test
    public void producerIsRetainedAndReEvaluatedEachUpdate() {
        int[] reads = {0};
        telemetry.addData("count", () -> ++reads[0]);

        assertEquals(Arrays.asList("count: 1"), update());
        assertEquals(Arrays.asList("count: 2"), update());
        assertEquals(2, reads[0], "the producer must be read exactly once per update");
    }

    @Test
    public void addDataReturnsAnItemThatCanBeRetainedAndUpdated() {
        Telemetry.Item kept = telemetry.addData("kept", 0).setRetained(true);
        kept.setValue(5);
        telemetry.addData("gone", 2);
        telemetry.clear();

        assertEquals(Arrays.asList("kept: 5"), update());
    }

    @Test
    public void theLogIsResentEachUpdateAndNumbered() {
        telemetry.log().add("a");
        telemetry.log().add("%d", 2);
        telemetry.update();
        telemetry.update();

        assertEquals(Arrays.asList("a", "2"), sent.get(1).getLog());
        assertArrayEquals(new long[] {1, 2}, sent.get(1).getLogRange());
    }

    @Test
    public void prunedEntriesTakeTheirNumbersWithThemInEitherOrder() {
        for (int i = 0; i < 15; i++) {
            telemetry.log().add("entry " + i);
        }
        telemetry.update();
        telemetry.log().setCapacity(3);
        telemetry.log().setDisplayOrder(Telemetry.Log.DisplayOrder.NEWEST_FIRST);
        telemetry.update();

        assertEquals(9, sent.get(0).getLog().size());
        assertArrayEquals(new long[] {7, 15}, sent.get(0).getLogRange());
        assertEquals(Arrays.asList("entry 14", "entry 13", "entry 12"), sent.get(1).getLog());
        assertArrayEquals(new long[] {15, 13}, sent.get(1).getLogRange());
    }

    // A client that misses a clear or an op mode change must still see the new entry as new.
    @Test
    public void numberingContinuesThroughClearAndReset() {
        telemetry.log().add("a");
        telemetry.log().add("b");
        telemetry.log().clear();
        telemetry.reset();
        telemetry.log().add("a");
        telemetry.update();

        assertArrayEquals(new long[] {3, 3}, sent.get(0).getLogRange());
    }

    @Test
    public void resetRestoresTheSdkDefaultsForANewOpMode() {
        telemetry.setAutoClear(false);
        telemetry.setDisplayFormat(Telemetry.DisplayFormat.HTML);
        telemetry.setCaptionValueSeparator("=");
        telemetry.setItemSeparator(", ");
        telemetry.addData("stale", 1);
        telemetry.log().add("stale");
        telemetry.update();
        telemetry.update();
        assertEquals(TelemetryPacket.DisplayFormat.HTML, sent.get(1).getDisplayFormat());

        telemetry.reset();

        assertEquals(Collections.<String>emptyList(), update());
        TelemetryPacket packet = sent.get(2);
        assertTrue(telemetry.isAutoClear());
        assertEquals(Collections.<String>emptyList(), packet.getLog());
        assertEquals(TelemetryPacket.DisplayFormat.CLASSIC, packet.getDisplayFormat());
        assertEquals(" : ", packet.getCaptionValueSeparator());
        assertEquals(" | ", telemetry.getItemSeparator());
        assertTrue(packet.isTelemetryFrame());
    }

    @Test
    public void multipleTelemetryRemovesEachDelegatesOwnItemAndLine() {
        Telemetry.Item x = multiple.addLine("pose ").addData("x", 1);
        x.addData("y", 2);
        Telemetry.Item top = multiple.addData("top", 1);
        Telemetry.Line gone = multiple.addLine("gone");
        // A delegate added later holds none of these, which must not fail the removal.
        multiple.addTelemetry(recording(new ArrayList<>()));

        assertTrue(multiple.removeItem(top));
        assertTrue(multiple.removeLine(gone));
        assertTrue(multiple.removeItem(x));
        multiple.update();

        assertEquals(Arrays.asList("pose y : 2"), lastLines(sent));
        assertEquals(Arrays.asList("pose y : 2"), lastLines(sentB));
    }

    @Test
    public void multipleTelemetryRunsAnActionOncePerUpdate() {
        int[] runs = {0};
        multiple.addAction(() -> runs[0]++);
        multiple.update();
        multiple.update();

        assertEquals(2, runs[0]);
    }

    // The SDK's Item.addData returns the new item, so a chain inserts each item after the last.
    @Test
    public void multipleTelemetryChainsOffTheAddedItem() {
        Telemetry.Item a = multiple.addData("a", 1);
        multiple.addData("z", 26);
        a.addData("b", 2).addData("c", 3);
        multiple.update();

        assertEquals(Arrays.asList("a: 1", "b: 2", "c: 3", "z: 26"), lastLines(sentB));
    }
}
