package com.acmerobotics.dashboard.telemetry;

import com.acmerobotics.dashboard.FtcDashboard;
import com.acmerobotics.dashboard.canvas.Canvas;

import org.firstinspires.ftc.robotcore.external.Consumer;
import org.firstinspires.ftc.robotcore.external.Func;
import org.firstinspires.ftc.robotcore.external.Telemetry;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Container for telemetry information. This class can be extended to support additional, custom
 * telemetry data.
 */
public class TelemetryPacket {
    private long timestamp;
    private Map<String, String> data;
    private List<String> log;
    private Canvas fieldOverlay;

    /**
     * Creates a new telemetry packet.
     */
    public TelemetryPacket() {
        data = new HashMap<>();
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
     * Adds the current timestamp to the packet. This is called automatically when the packet is
     * sent (and any previous timestamp will be overwritten).
     */
    public void addTimestamp() {
        timestamp = System.currentTimeMillis();
    }

    /**
     * Returns the field overlay canvas.
     */
    public Canvas fieldOverlay() {
        return fieldOverlay;
    }

    /**
     * Adapter to use dashboard telemetry like normal SDK telemetry. Note that this doesn't support
     * all of the operations yet.
     */
    public static class Adapter implements Telemetry {
        private FtcDashboard dashboard;
        private TelemetryPacket currentPacket;
        private LogAdapter log;

        public Adapter(FtcDashboard dashboard) {
            this.dashboard = dashboard;
            clear();
        }

        @Override
        public Item addData(String caption, String format, Object... args) {
            return addData(caption, String.format(format, args));
        }

        @Override
        public Item addData(String caption, Object value) {
            currentPacket.put(caption, value);
            return null;
        }

        @Override
        public <T> Item addData(String caption, Func<T> valueProducer) {
            throw new UnsupportedOperationException();
        }

        @Override
        public <T> Item addData(String caption, String format, Func<T> valueProducer) {
            throw new UnsupportedOperationException();
        }

        @Override
        public boolean removeItem(Item item) {
            throw new UnsupportedOperationException();
        }

        @Override
        public void clear() {
            currentPacket = new TelemetryPacket();
            log = new LogAdapter(currentPacket);
        }

        @Override
        public void clearAll() {
            currentPacket = new TelemetryPacket();
        }

        @Override
        public Object addAction(Runnable action) {
            throw new UnsupportedOperationException();
        }

        @Override
        public boolean removeAction(Object token) {
            throw new UnsupportedOperationException();
        }

        @Override
        public boolean update() {
            dashboard.sendTelemetryPacket(currentPacket);
            clear();
            return true;
        }

        @Override
        public Line addLine() {
            return null;
        }

        @Override
        public Line addLine(String lineCaption) {
            currentPacket.addLine(lineCaption);
            return null;
        }

        @Override
        public boolean removeLine(Line line) {
            throw new UnsupportedOperationException();
        }

        @Override
        public boolean isAutoClear() {
            return true;
        }

        @Override
        public void setAutoClear(boolean autoClear) {

        }

        @Override
        public int getMsTransmissionInterval() {
            return dashboard.getTelemetryTransmissionInterval();
        }

        @Override
        public void setMsTransmissionInterval(int msTransmissionInterval) {
            dashboard.setTelemetryTransmissionInterval(msTransmissionInterval);
        }

        @Override
        public String getItemSeparator() {
            return null;
        }

        @Override
        public void setItemSeparator(String itemSeparator) {

        }

        @Override
        public String getCaptionValueSeparator() {
            return null;
        }

        @Override
        public void setCaptionValueSeparator(String captionValueSeparator) {

        }

        @Override
        public Log log() {
            return log;
        }
    }

    private static class LogAdapter implements Telemetry.Log {
        private TelemetryPacket telemetryPacket;

        private LogAdapter(TelemetryPacket packet) {
            telemetryPacket = packet;
        }

        @Override
        public int getCapacity() {
            return 0;
        }

        @Override
        public void setCapacity(int capacity) {

        }

        @Override
        public DisplayOrder getDisplayOrder() {
            return DisplayOrder.OLDEST_FIRST;
        }

        @Override
        public void setDisplayOrder(DisplayOrder displayOrder) {

        }

        @Override
        public void add(String entry) {
            telemetryPacket.addLine(entry);
        }

        @Override
        public void add(String format, Object... args) {
            telemetryPacket.addLine(String.format(format, args));
        }

        @Override
        public void clear() {
            telemetryPacket.clearLines();
        }
    }
}
