package com.acmerobotics.dashboard;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.acmerobotics.dashboard.telemetry.TelemetryPacket;
import com.google.gson.JsonObject;
import org.junit.jupiter.api.Test;

public class TelemetryPacketTests {
    // The real serializer, so these pin what actually goes on the wire. Notably it serializes
    // nulls, so a bare line is sent as "caption":null rather than omitting the key.
    private static JsonObject serialize(TelemetryPacket packet) {
        return DashboardCore.GSON.toJsonTree(packet).getAsJsonObject();
    }

    @Test
    public void itemsKeepInsertionOrderWithLinesInPlace() {
        TelemetryPacket packet = new TelemetryPacket(false);
        packet.put("zebra", 1);
        packet.addLine("--- drive ---");
        packet.put("apple", 2);
        packet.addItem("sticks").appendValue(" | x: 0.5");
        packet.put("zebra", 3);

        JsonObject json = serialize(packet);
        assertEquals(
                "[{\"caption\":\"zebra\",\"value\":\"3\"},"
                        + "{\"caption\":null,\"value\":\"--- drive ---\"},"
                        + "{\"caption\":\"apple\",\"value\":\"2\"},"
                        + "{\"caption\":null,\"value\":\"sticks | x: 0.5\"}]",
                json.get("items").toString());
        assertEquals("{\"apple\":\"2\",\"zebra\":\"3\"}", json.get("data").toString());
    }

    // The SDK renders a null caption as the text "null", which must not match a bare line.
    @Test
    public void nullKeyIsCaptionedNullAndLeavesBareLinesAlone() {
        TelemetryPacket packet = new TelemetryPacket(false);
        packet.addLine("a bare line");
        packet.put(null, 5);

        assertEquals(
                "[{\"caption\":null,\"value\":\"a bare line\"},"
                        + "{\"caption\":\"null\",\"value\":\"5\"}]",
                serialize(packet).get("items").toString());
    }

    @Test
    public void clearLinesLeavesKeyedItemsAndLogAlone() {
        TelemetryPacket packet = new TelemetryPacket(false);
        packet.put("a", 1);
        packet.addLine("gone");
        packet.addLogEntry("kept");
        packet.clearLines();

        JsonObject json = serialize(packet);
        assertEquals("[{\"caption\":\"a\",\"value\":\"1\"}]", json.get("items").toString());
        assertEquals("[\"kept\"]", json.get("log").toString());
    }

    // A packet built directly has no Telemetry to call setDisplayFormat on, and never reaches a
    // Driver Station, so it keeps rendering markup the way the dashboard always has.
    @Test
    public void handBuiltPacketDefaultsToHtmlAndAnUnnumberedLog() {
        TelemetryPacket packet = new TelemetryPacket(false);
        packet.addLogEntry("tick");

        JsonObject json = serialize(packet);
        assertEquals("\"HTML\"", json.get("displayFormat").toString());
        assertEquals("null", json.get("logRange").toString());
    }
}
