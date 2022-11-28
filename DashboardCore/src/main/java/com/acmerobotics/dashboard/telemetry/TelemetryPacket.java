package com.acmerobotics.dashboard.telemetry;

import com.acmerobotics.dashboard.canvas.Canvas;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.SortedMap;
import java.util.TreeMap;

/**
 * Container for telemetry information. This class can be extended to support additional, custom
 * telemetry data.
 */
public class TelemetryPacket {
    private long timestamp;
    private SortedMap<String, String> data;
    private List<String> log;
    private Canvas fieldOverlay;

    /**
     * Creates a new telemetry packet.
     */
    public TelemetryPacket() {
        data = new TreeMap<>();
        log = new ArrayList<>();
        fieldOverlay = new Canvas();
    }

    /**
     * Stores a single key-value pair.
     * @param key
     * @param value
     */
    public void put(String key, Object value) {
        data.put(key, value == null ? "null" : value.toString());
    }

    /**
     * Stores all entries of the provided map.
     * @param map
     */
    public void putAll(Map<String, Object> map) {
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            put(entry.getKey(), entry.getValue());
        }
    }

    /**
     * Adds a line to the telemetry log.
     * @param line
     */
    public void addLine(String line) {
        log.add(line);
    }

    /**
     * Clears the telemetry log.
     */
    public void clearLines() {
        log.clear();
    }

    /**
     * Adds and returns the current timestamp to the packet. This is called automatically when the
     * packet is sent (and any previous timestamp will be overwritten).
     */
    public long addTimestamp() {
        timestamp = System.currentTimeMillis();
        return timestamp;
    }

    /**
     * Returns the field overlay canvas.
     */
    public Canvas fieldOverlay() {
        return fieldOverlay;
    }
}
