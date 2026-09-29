package com.acmerobotics.dashboard;

import com.acmerobotics.dashboard.telemetry.TelemetryPacket;
import java.text.DecimalFormat;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import org.firstinspires.ftc.robotcore.external.Func;
import org.firstinspires.ftc.robotcore.external.Telemetry;

/**
 * Adapter to use dashboard telemetry like SDK telemetry. Keeps a model rather than writing into a
 * packet as calls arrive, so items stay addressable and producers re-evaluate every update.
 */
public class DashboardTelemetry implements Telemetry {
    /** An interface, so the telemetry logic can be exercised without an Android runtime. */
    public interface Host {
        void sendTelemetryPacket(TelemetryPacket packet);

        int getTelemetryTransmissionInterval();

        void setTelemetryTransmissionInterval(int interval);
    }

    private final Host host;

    public DashboardTelemetry(Host host) {
        this.host = host;
    }

    private static final String DEFAULT_CAPTION_VALUE_SEPARATOR = " : ";
    private static final String DEFAULT_ITEM_SEPARATOR = " | ";

    // Items and lines share one list, so that they display in the order they were added.
    private final List<Object> entries = new ArrayList<>();
    private final List<Runnable> actions = new ArrayList<>();
    private final LogAdapter log = new LogAdapter();

    private String captionValueSeparator = DEFAULT_CAPTION_VALUE_SEPARATOR;
    private String itemSeparator = DEFAULT_ITEM_SEPARATOR;
    private TelemetryPacket.DisplayFormat displayFormat = TelemetryPacket.DisplayFormat.CLASSIC;
    private DecimalFormat decimalFormat = new DecimalFormat("0.####");
    private boolean autoClear = true;
    private boolean clearOnAdd;

    /**
     * Starts a new op mode as the SDK does, with a fresh model, log and defaults, and CLASSIC
     * display. The transmission interval returns to the dashboard's default, not the SDK's 250 ms.
     */
    synchronized void reset() {
        entries.clear();
        actions.clear();
        log.reset();
        captionValueSeparator = DEFAULT_CAPTION_VALUE_SEPARATOR;
        itemSeparator = DEFAULT_ITEM_SEPARATOR;
        displayFormat = TelemetryPacket.DisplayFormat.CLASSIC;
        decimalFormat = new DecimalFormat("0.####");
        autoClear = true;
        clearOnAdd = false;
        host.setTelemetryTransmissionInterval(
                DashboardCore.DEFAULT_TELEMETRY_TRANSMISSION_INTERVAL);
    }

    // As the SDK's Value: a Double or Float is formatted when added, anything else when composed.
    synchronized ValueSource valueOf(Object value) {
        String text =
                value instanceof Double || value instanceof Float
                        ? decimalFormat.format(value)
                        : null;
        return new ValueSource(null, null, value, text, null);
    }

    // The SDK clears on the first add after update(), not during it.
    void onAddData() {
        if (clearOnAdd) {
            clearOnAdd = false;
            clearNonRetained();
        }
    }

    // Non-retained items go; a line is removed only once empty.
    private void clearNonRetained() {
        Iterator<Object> it = entries.iterator();
        while (it.hasNext()) {
            Object entry = it.next();

            if (entry instanceof ItemAdapter) {
                if (!((ItemAdapter) entry).isRetained()) {
                    it.remove();
                }
            } else {
                LineAdapter line = (LineAdapter) entry;
                line.clearNonRetained();
                if (line.isEmpty()) {
                    it.remove();
                }
            }
        }
    }

    // Bounded as the SDK does, so a forgotten update() cannot eat memory.
    static final int MAX_ENTRIES = 255;

    synchronized ItemAdapter addItem(String caption, ValueSource value, Object after) {
        onAddData();

        ItemAdapter item = new ItemAdapter(this, null, caption, value);

        if (entries.size() < MAX_ENTRIES) {
            int index = after == null ? entries.size() : entries.indexOf(after) + 1;
            entries.add(index, item);
        }

        return item;
    }

    @Override
    public Item addData(String caption, String format, Object... args) {
        return addItem(caption, ValueSource.of(format, args), null);
    }

    @Override
    public Item addData(String caption, Object value) {
        return addItem(caption, valueOf(value), null);
    }

    @Override
    public <T> Item addData(String caption, Func<T> valueProducer) {
        return addItem(caption, ValueSource.of(valueProducer), null);
    }

    @Override
    public <T> Item addData(String caption, String format, Func<T> valueProducer) {
        return addItem(caption, ValueSource.of(format, valueProducer), null);
    }

    @Override
    public synchronized boolean removeItem(Item item) {
        if (entries.remove(item)) {
            return true;
        }

        for (Object entry : entries) {
            if (entry instanceof LineAdapter && ((LineAdapter) entry).remove(item)) {
                return true;
            }
        }

        return false;
    }

    @Override
    public synchronized void clear() {
        clearOnAdd = false;
        clearNonRetained();
    }

    // As the SDK's clearAll(): every item and action, but not the log.
    @Override
    public synchronized void clearAll() {
        clearOnAdd = false;
        entries.clear();
        actions.clear();
    }

    @Override
    public synchronized Object addAction(Runnable action) {
        actions.add(action);
        return action;
    }

    @Override
    public synchronized boolean removeAction(Object token) {
        return actions.remove(token);
    }

    // The Driver Station does the speaking, so combined telemetry still speaks once.
    @Override
    public void speak(String text) {
        // intentionally empty
    }

    @Override
    public void speak(String text, String languageCode, String countryCode) {
        // intentionally empty
    }

    @Override
    public boolean update() {
        FramePacket packet = new FramePacket();

        List<Runnable> pending;
        synchronized (this) {
            pending = new ArrayList<>(actions);
        }

        // Outside the monitor: an action is user code, and a slow one would block reset().
        for (Runnable action : pending) {
            action.run();
        }

        // Outside the monitor for the same reason as actions: a producer may read a sensor.
        List<Object> snapshot = new ArrayList<>();
        String itemSeparator;
        String captionValueSeparator;
        synchronized (this) {
            packet.markTelemetryFrame();
            packet.setDisplayFormat(displayFormat);
            packet.setCaptionValueSeparator(this.captionValueSeparator);
            itemSeparator = this.itemSeparator;
            captionValueSeparator = this.captionValueSeparator;
            for (Object entry : entries) {
                snapshot.add(entry instanceof LineAdapter ? ((LineAdapter) entry).copy() : entry);
            }
            clearOnAdd = autoClear;
        }

        {
            for (Object entry : snapshot) {
                if (entry instanceof ItemAdapter) {
                    ItemAdapter item = (ItemAdapter) entry;
                    Resolved resolved = item.resolve();

                    packet.add(item.getCaption(), resolved.text);

                    // Unrounded, so the graph and CSV keep full precision.
                    if (resolved.raw != null) {
                        packet.putData(item.getCaption(), resolved.raw);
                    }
                } else {
                    ((LineAdapter) entry).saveTo(packet, itemSeparator, captionValueSeparator);
                }
            }

            // Retransmitted every packet, so a one-off entry stays on screen.
            log.saveTo(packet);
        }

        host.sendTelemetryPacket(packet);

        return true;
    }

    @Override
    public synchronized Line addLine() {
        return addLine("");
    }

    @Override
    public synchronized Line addLine(String lineCaption) {
        onAddData();

        LineAdapter line = new LineAdapter(this, String.valueOf(lineCaption));

        if (entries.size() < MAX_ENTRIES) {
            entries.add(line);
        }

        return line;
    }

    @Override
    public synchronized boolean removeLine(Line line) {
        return entries.remove(line);
    }

    @Override
    public synchronized boolean isAutoClear() {
        return autoClear;
    }

    @Override
    public synchronized void setAutoClear(boolean autoClear) {
        this.autoClear = autoClear;
    }

    @Override
    public int getMsTransmissionInterval() {
        return host.getTelemetryTransmissionInterval();
    }

    @Override
    public void setMsTransmissionInterval(int msTransmissionInterval) {
        host.setTelemetryTransmissionInterval(msTransmissionInterval);
    }

    @Override
    public synchronized String getItemSeparator() {
        return itemSeparator;
    }

    @Override
    public synchronized void setItemSeparator(String itemSeparator) {
        if (itemSeparator != null) {
            this.itemSeparator = itemSeparator;
        }
    }

    @Override
    public synchronized String getCaptionValueSeparator() {
        return captionValueSeparator;
    }

    @Override
    public synchronized void setCaptionValueSeparator(String captionValueSeparator) {
        if (captionValueSeparator != null) {
            this.captionValueSeparator = captionValueSeparator;
        }
    }

    @Override
    public synchronized void setNumDecimalPlaces(int minDecimalPlaces, int maxDecimalPlaces) {
        decimalFormat.setMinimumFractionDigits(minDecimalPlaces);
        decimalFormat.setMaximumFractionDigits(maxDecimalPlaces);
    }

    @Override
    public synchronized void setDisplayFormat(DisplayFormat displayFormat) {
        if (displayFormat == null) {
            return;
        }

        switch (displayFormat) {
            case MONOSPACE:
                this.displayFormat = TelemetryPacket.DisplayFormat.MONOSPACE;
                break;
            case HTML:
                this.displayFormat = TelemetryPacket.DisplayFormat.HTML;
                break;
            default:
                this.displayFormat = TelemetryPacket.DisplayFormat.CLASSIC;
                break;
        }
    }

    @Override
    public Log log() {
        return log;
    }

    /** Holds a producer rather than calling it, so it re-evaluates every update. */
    private static final class ValueSource {
        private final String format;
        private final Object[] args;
        private final Object value;
        private final String text;
        private final Func<?> producer;

        ValueSource(String format, Object[] args, Object value, String text, Func<?> producer) {
            this.format = format;
            this.args = args;
            this.value = value;
            this.text = text;
            this.producer = producer;
        }

        static ValueSource of(String format, Object... args) {
            return new ValueSource(format, args, null, null, null);
        }

        static ValueSource of(Func<?> producer) {
            return new ValueSource(null, null, null, null, producer);
        }

        static ValueSource of(String format, Func<?> producer) {
            return new ValueSource(format, null, null, null, producer);
        }

        boolean isProducer() {
            return producer != null;
        }

        /** Exactly once per update: a producer may read a sensor. */
        Resolved resolve() {
            if (format != null) {
                if (args != null) {
                    return new Resolved(null, String.format(format, args));
                }

                if (producer != null) {
                    return new Resolved(null, String.format(format, producer.value()));
                }

                return new Resolved(null, "");
            }

            if (producer != null) {
                // The SDK does not round a producer's value, only a plain one.
                Object raw = producer.value();
                return new Resolved(raw, raw == null ? "" : raw.toString());
            }

            if (text != null) {
                return new Resolved(value, text);
            }

            // The SDK composes a null value as an empty string.
            return new Resolved(value, value == null ? "" : value.toString());
        }
    }

    /** Reaches the packet's protected members, which hand-built packets do not get. */
    private static final class FramePacket extends TelemetryPacket {
        void add(String caption, String text) {
            append(caption, text);
        }

        void numberLog(long first, long last) {
            setLogRange(first, last);
        }
    }

    /** The text to display plus the object it came from, so the keyed view keeps full precision. */
    private static final class Resolved {
        final Object raw;
        final String text;

        Resolved(Object raw, String text) {
            this.raw = raw;
            this.text = text;
        }
    }

    /** Returned from addData() so the value can be updated later; null would break callers. */
    private static final class ItemAdapter implements Telemetry.Item {
        private final DashboardTelemetry telemetry;
        // The containing line, or null at top level; chained addData() adds to the same container.
        private final LineAdapter line;
        private String caption;
        private ValueSource value;
        private Boolean retained;

        ItemAdapter(
                DashboardTelemetry telemetry, LineAdapter line, String caption, ValueSource value) {
            this.telemetry = telemetry;
            this.line = line;
            this.caption = caption;
            this.value = value;
        }

        Resolved resolve() {
            return value.resolve();
        }

        private Telemetry.Item chain(String caption, ValueSource value) {
            return line == null
                    ? telemetry.addItem(caption, value, this)
                    : line.addAfter(this, caption, value);
        }

        @Override
        public String getCaption() {
            return caption;
        }

        @Override
        public Telemetry.Item setCaption(String caption) {
            this.caption = caption;
            return this;
        }

        @Override
        public Telemetry.Item setValue(String format, Object... args) {
            value = ValueSource.of(format, args);
            return this;
        }

        @Override
        public Telemetry.Item setValue(Object value) {
            this.value = telemetry.valueOf(value);
            return this;
        }

        @Override
        public <T> Telemetry.Item setValue(Func<T> valueProducer) {
            value = ValueSource.of(valueProducer);
            return this;
        }

        @Override
        public <T> Telemetry.Item setValue(String format, Func<T> valueProducer) {
            value = ValueSource.of(format, valueProducer);
            return this;
        }

        // A producer is retained by default, since the whole point of one is to be re-read.
        @Override
        public boolean isRetained() {
            return retained != null ? retained : value.isProducer();
        }

        @Override
        public Telemetry.Item setRetained(Boolean retained) {
            this.retained = retained;
            return this;
        }

        // Chaining off a top-level item adds another top-level item just after it, as the SDK does.
        @Override
        public Telemetry.Item addData(String caption, String format, Object... args) {
            return chain(caption, ValueSource.of(format, args));
        }

        @Override
        public Telemetry.Item addData(String caption, Object value) {
            return chain(caption, telemetry.valueOf(value));
        }

        @Override
        public <T> Telemetry.Item addData(String caption, Func<T> valueProducer) {
            return chain(caption, ValueSource.of(valueProducer));
        }

        @Override
        public <T> Telemetry.Item addData(String caption, String format, Func<T> valueProducer) {
            return chain(caption, ValueSource.of(format, valueProducer));
        }
    }

    /** Composes a line as the SDK does: caption, then each item's caption + separator + value. */
    private static final class LineAdapter implements Telemetry.Line {
        private final DashboardTelemetry telemetry;
        private final String lineCaption;
        private final List<ItemAdapter> items = new ArrayList<>();

        LineAdapter(DashboardTelemetry telemetry, String lineCaption) {
            this.telemetry = telemetry;
            this.lineCaption = lineCaption;
        }

        boolean remove(Telemetry.Item item) {
            synchronized (telemetry) {
                return items.remove(item);
            }
        }

        boolean isEmpty() {
            synchronized (telemetry) {
                return items.isEmpty();
            }
        }

        void clearNonRetained() {
            synchronized (telemetry) {
                Iterator<ItemAdapter> it = items.iterator();
                while (it.hasNext()) {
                    if (!it.next().isRetained()) {
                        it.remove();
                    }
                }
            }
        }

        // Its items as they are now, so update() can compose the line outside the monitor.
        LineAdapter copy() {
            synchronized (telemetry) {
                LineAdapter copy = new LineAdapter(telemetry, lineCaption);
                copy.items.addAll(items);
                return copy;
            }
        }

        void saveTo(TelemetryPacket packet, String itemSeparator, String captionValueSeparator) {
            StringBuilder composed = new StringBuilder(lineCaption);

            for (int i = 0; i < items.size(); i++) {
                ItemAdapter item = items.get(i);
                Resolved resolved = item.resolve();

                if (i > 0) {
                    composed.append(itemSeparator);
                }
                composed.append(item.getCaption())
                        .append(captionValueSeparator)
                        .append(resolved.text);

                // Keyed for the graph, but already displayed in this line.
                packet.putData(
                        item.getCaption(), resolved.raw != null ? resolved.raw : resolved.text);
            }

            packet.addLine(composed.toString());
        }

        Telemetry.Item addAfter(ItemAdapter after, String caption, ValueSource value) {
            synchronized (telemetry) {
                // Adding to a line is still adding data, so a pending auto-clear fires here too.
                telemetry.onAddData();

                ItemAdapter item = new ItemAdapter(telemetry, this, caption, value);

                if (items.size() < DashboardTelemetry.MAX_ENTRIES) {
                    int index = after == null ? items.size() : items.indexOf(after) + 1;
                    items.add(index, item);
                }

                return item;
            }
        }

        @Override
        public Telemetry.Item addData(String caption, String format, Object... args) {
            return addAfter(null, caption, ValueSource.of(format, args));
        }

        @Override
        public Telemetry.Item addData(String caption, Object value) {
            return addAfter(null, caption, telemetry.valueOf(value));
        }

        @Override
        public <T> Telemetry.Item addData(String caption, Func<T> valueProducer) {
            return addAfter(null, caption, ValueSource.of(valueProducer));
        }

        @Override
        public <T> Telemetry.Item addData(String caption, String format, Func<T> valueProducer) {
            return addAfter(null, caption, ValueSource.of(format, valueProducer));
        }
    }

    /**
     * Holds the log itself, not a packet: {@link MultipleTelemetry} calls {@code log()} once and
     * keeps the result, so a packet would strand entries in an already-sent one.
     */
    private static final class LogAdapter implements Telemetry.Log {
        private static final int DEFAULT_CAPACITY = 9;

        private final List<String> entries = new ArrayList<>();
        // Survives reset(), so a client that misses an op mode change never sees a number reused.
        private long added;
        private int capacity = DEFAULT_CAPACITY;
        private DisplayOrder displayOrder = DisplayOrder.OLDEST_FIRST;

        synchronized void reset() {
            entries.clear();
            capacity = DEFAULT_CAPACITY;
            displayOrder = DisplayOrder.OLDEST_FIRST;
        }

        synchronized void saveTo(FramePacket packet) {
            if (entries.isEmpty()) {
                return;
            }

            // Pruning drops the oldest and clear() drops all, so the newest added are what remain.
            long oldest = added - entries.size() + 1;

            if (displayOrder == DisplayOrder.OLDEST_FIRST) {
                for (String entry : entries) {
                    packet.addLogEntry(entry);
                }
                packet.numberLog(oldest, added);
            } else {
                for (int i = entries.size() - 1; i >= 0; i--) {
                    packet.addLogEntry(entries.get(i));
                }
                packet.numberLog(added, oldest);
            }
        }

        @Override
        public synchronized int getCapacity() {
            return capacity;
        }

        @Override
        public synchronized void setCapacity(int capacity) {
            this.capacity = capacity;
            prune();
        }

        @Override
        public synchronized DisplayOrder getDisplayOrder() {
            return displayOrder;
        }

        @Override
        public synchronized void setDisplayOrder(DisplayOrder displayOrder) {
            this.displayOrder = displayOrder;
        }

        @Override
        public synchronized void add(String entry) {
            entries.add(entry);
            added++;
            prune();
        }

        @Override
        public void add(String format, Object... args) {
            add(String.format(format, args));
        }

        @Override
        public synchronized void clear() {
            entries.clear();
        }

        // The oldest entry is always the one dropped, whatever the display order.
        private void prune() {
            while (entries.size() > capacity && !entries.isEmpty()) {
                entries.remove(0);
            }
        }
    }
}
