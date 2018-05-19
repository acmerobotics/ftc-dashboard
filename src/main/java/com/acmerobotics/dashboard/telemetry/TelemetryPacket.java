package com.acmerobotics.dashboard.telemetry;

import com.acmerobotics.dashboard.canvas.Canvas;

import org.firstinspires.ftc.robotcore.external.Consumer;
import org.firstinspires.ftc.robotcore.external.Func;
import org.firstinspires.ftc.robotcore.external.Telemetry;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class TelemetryPacket {
    private long timestamp;
    private Map<String, String> data;
    private List<String> log;
    private Canvas fieldOverlay;

    public TelemetryPacket() {
        data = new HashMap<>();
        log = new ArrayList<>();
        fieldOverlay = new Canvas();
    }

    public void put(String key, Object value) {
        data.put(key, value == null ? "null" : value.toString());
    }

    public void putAll(Map<String, Object> map) {
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            put(entry.getKey(), entry.getValue());
        }
    }

    public void addLine(String line) {
        log.add(line);
    }

    public void addTimestamp() {
        timestamp = System.currentTimeMillis();
    }

    public Canvas fieldOverlay() {
        return fieldOverlay;
    }

    public static class Adapter implements Telemetry {
        private TelemetryPacket currentPacket;
        private Consumer<TelemetryPacket> packetConsumer;

        public Adapter(Consumer<TelemetryPacket> packetConsumer) {
            this.packetConsumer = packetConsumer;
            currentPacket = new TelemetryPacket();
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
            packetConsumer.accept(currentPacket);
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
            return false;
        }

        @Override
        public void setAutoClear(boolean autoClear) {

        }

        @Override
        public int getMsTransmissionInterval() {
            return 0;
        }

        @Override
        public void setMsTransmissionInterval(int msTransmissionInterval) {

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
            throw new UnsupportedOperationException();
        }

        public TelemetryPacket getCurrentPacket() {
            return currentPacket;
        }
    }
}
