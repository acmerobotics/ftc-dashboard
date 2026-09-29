package com.acmerobotics.dashboard.telemetry;

import com.acmerobotics.dashboard.canvas.Canvas;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.SortedMap;
import java.util.TreeMap;

/**
 * Container for telemetry information. This class can be extended to support additional, custom
 * telemetry data.
 *
 * <p>Items and lines share one ordered list; log entries render below, as on the Driver Station.
 */
public class TelemetryPacket {
    /** Mirrors the SDK's Telemetry.DisplayFormat. */
    public enum DisplayFormat {
        CLASSIC,
        MONOSPACE,
        HTML
    }

    /** A displayed entry. A null caption is a bare line, rendered without a separator. */
    public static final class Item {
        private final String caption;
        private String value;

        Item(String caption, String value) {
            this.caption = caption;
            this.value = value;
        }

        public String getCaption() {
            return caption;
        }

        public String getValue() {
            return value;
        }

        public void setValue(String value) {
            this.value = value == null ? "null" : value;
        }

        public void appendValue(String suffix) {
            value += suffix;
        }
    }

    private long timestamp;
    private SortedMap<String, String> data;
    private List<String> log;
    private long[] logRange;
    private Canvas field;
    private Canvas fieldOverlay;
    private List<Item> items;
    private DisplayFormat displayFormat;
    private String captionValueSeparator;
    private boolean telemetryFrame;

    private static final String DEFAULT_CAPTION_VALUE_SEPARATOR = ": ";

    private static final Canvas DEFAULT_FIELD = new Canvas();

    static {
        DEFAULT_FIELD.setAlpha(0.4);
        DEFAULT_FIELD.drawImage("/dash/decode.webp", 0, 0, 144, 144);
        DEFAULT_FIELD.setAlpha(1.0);
        DEFAULT_FIELD.drawGrid(0, 0, 144, 144, 7, 7);
    }

    /** Creates a new telemetry packet. */
    public TelemetryPacket(boolean drawDefaultField) {
        data = new TreeMap<>();
        log = new ArrayList<>();
        items = new ArrayList<>();
        displayFormat = DisplayFormat.HTML;
        captionValueSeparator = DEFAULT_CAPTION_VALUE_SEPARATOR;
        field = new Canvas();
        fieldOverlay = new Canvas();

        if (drawDefaultField) {
            field.getOperations().addAll(DEFAULT_FIELD.getOperations());
        }
    }

    public TelemetryPacket() {
        this(true);
    }

    /**
     * Stores a single key-value pair. A key already present is overwritten in place, unlike the
     * SDK's {@code addData()}.
     *
     * @param key entry key
     * @param value entry value
     */
    public void put(String key, Object value) {
        String caption = captionOf(key);
        String stringValue = value == null ? "null" : value.toString();

        data.put(caption, stringValue);

        for (Item item : items) {
            if (Objects.equals(item.getCaption(), caption)) {
                item.setValue(stringValue);
                return;
            }
        }

        items.add(new Item(caption, stringValue));
    }

    /**
     * Adds a key-value pair as the SDK's addData() does: a repeated key is displayed again rather
     * than overwritten. The keyed data keeps the latest value.
     */
    protected void append(String key, Object value) {
        String caption = captionOf(key);
        String stringValue = value == null ? "null" : value.toString();

        data.put(caption, stringValue);
        items.add(new Item(caption, stringValue));
    }

    /** Stores a key-value pair for the graph and logging views without displaying it. */
    public void putData(String key, Object value) {
        data.put(captionOf(key), value == null ? "null" : value.toString());
    }

    // A null caption means "bare line", so a null key renders as the SDK would format it.
    private static String captionOf(String key) {
        return key == null ? "null" : key;
    }

    /**
     * Stores all entries of the provided map.
     *
     * @param map entries to store
     */
    public void putAll(Map<String, Object> map) {
        for (Map.Entry<String, Object> entry : map.entrySet()) {
            put(entry.getKey(), entry.getValue());
        }
    }

    /**
     * Adds a line in place, between the items added before and after it.
     *
     * @param line text to append
     */
    public void addLine(String line) {
        addItem(line);
    }

    /** Like addLine, but returns the line so values can be appended to it. */
    public Item addItem(String value) {
        Item item = new Item(null, value == null ? "" : value);
        items.add(item);
        return item;
    }

    /** Clears bare lines only; keyed items and log entries are left alone. */
    public void clearLines() {
        Iterator<Item> it = items.iterator();
        while (it.hasNext()) {
            if (it.next().getCaption() == null) {
                it.remove();
            }
        }
    }

    public void addLogEntry(String entry) {
        log.add(entry);
    }

    public void clearLog() {
        log.clear();
    }

    /** For a log resent whole each packet: its entries number consecutively from first to last. */
    protected void setLogRange(long first, long last) {
        logRange = new long[] {first, last};
    }

    public long[] getLogRange() {
        return logRange == null ? null : logRange.clone();
    }

    /** Direct packets default to HTML; FtcDashboard.getTelemetry() defaults to CLASSIC. */
    public void setDisplayFormat(DisplayFormat displayFormat) {
        this.displayFormat = displayFormat == null ? DisplayFormat.HTML : displayFormat;
    }

    public DisplayFormat getDisplayFormat() {
        return displayFormat;
    }

    /** Lets an empty packet clear the display; a pruned drawing-only packet looks the same. */
    public void markTelemetryFrame() {
        telemetryFrame = true;
    }

    public boolean isTelemetryFrame() {
        return telemetryFrame;
    }

    public void setCaptionValueSeparator(String captionValueSeparator) {
        this.captionValueSeparator =
                captionValueSeparator == null
                        ? DEFAULT_CAPTION_VALUE_SEPARATOR
                        : captionValueSeparator;
    }

    public String getCaptionValueSeparator() {
        return captionValueSeparator;
    }

    /**
     * Adds and returns the current timestamp to the packet. This is called automatically when the
     * packet is sent (and any previous timestamp will be overwritten).
     */
    public long addTimestamp() {
        timestamp = System.currentTimeMillis();
        return timestamp;
    }

    public List<Item> getItems() {
        return items;
    }

    public SortedMap<String, String> getData() {
        return data;
    }

    public List<String> getLog() {
        return log;
    }

    /** Returns the field overlay canvas. */
    public Canvas fieldOverlay() {
        return fieldOverlay;
    }

    public Canvas field() {
        return field;
    }
}
