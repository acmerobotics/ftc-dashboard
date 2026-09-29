package com.acmerobotics.dashboard.telemetry;

import androidx.annotation.Nullable;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.firstinspires.ftc.robotcore.external.Func;
import org.firstinspires.ftc.robotcore.external.Telemetry;

/** Delegate for a list of multiple telemetry objects. */
public class MultipleTelemetry implements Telemetry {
    private List<Telemetry> telemetryList;
    private MultipleLog log;

    public MultipleTelemetry(Telemetry... telemetryList) {
        this.telemetryList = new ArrayList<>(Arrays.asList(telemetryList));
        this.log = new MultipleLog();
        for (Telemetry telemetry : telemetryList) {
            this.log.addLog(telemetry.log());
        }
    }

    /**
     * Adds another telemetry object.
     *
     * @param telemetry delegate to add
     */
    public void addTelemetry(Telemetry telemetry) {
        this.telemetryList.add(telemetry);
        this.log.addLog(telemetry.log());
    }

    @Override
    public Item addData(String s, String s1, Object... objects) {
        List<Item> items = new ArrayList<>();
        for (Telemetry telemetry : telemetryList) {
            items.add(telemetry.addData(s, s1, objects));
        }
        return new MultipleItem(items);
    }

    @Override
    public Item addData(String s, Object o) {
        List<Item> items = new ArrayList<>();
        for (Telemetry telemetry : telemetryList) {
            items.add(telemetry.addData(s, o));
        }
        return new MultipleItem(items);
    }

    @Override
    public <T> Item addData(String s, Func<T> func) {
        List<Item> items = new ArrayList<>();
        for (Telemetry telemetry : telemetryList) {
            items.add(telemetry.addData(s, func));
        }
        return new MultipleItem(items);
    }

    @Override
    public <T> Item addData(String s, String s1, Func<T> func) {
        List<Item> items = new ArrayList<>();
        for (Telemetry telemetry : telemetryList) {
            items.add(telemetry.addData(s, s1, func));
        }
        return new MultipleItem(items);
    }

    // A delegate knows only its own item, which a MultipleItem holds at that delegate's index.
    @Override
    public boolean removeItem(Item item) {
        boolean retVal = true;
        for (int i = 0; i < telemetryList.size(); i++) {
            Item own = item;
            if (item instanceof MultipleItem) {
                List<Item> items = ((MultipleItem) item).items;
                if (i >= items.size()) {
                    break;
                }
                own = items.get(i);
            }
            boolean temp = telemetryList.get(i).removeItem(own);
            retVal = retVal && temp;
        }
        return retVal;
    }

    @Override
    public void clear() {
        for (Telemetry telemetry : telemetryList) {
            telemetry.clear();
        }
    }

    @Override
    public void clearAll() {
        for (Telemetry telemetry : telemetryList) {
            telemetry.clearAll();
        }
    }

    // One delegate only, or the action runs once per delegate per loop.
    @Override
    public Object addAction(Runnable runnable) {
        return telemetryList.get(0).addAction(runnable);
    }

    @Override
    public boolean removeAction(Object o) {
        return telemetryList.get(0).removeAction(o);
    }

    @Override
    public void speak(String text) {
        for (Telemetry telemetry : telemetryList) {
            telemetry.speak(text);
        }
    }

    @Override
    public void speak(String text, String languageCode, String countryCode) {
        for (Telemetry telemetry : telemetryList) {
            telemetry.speak(text, languageCode, countryCode);
        }
    }

    @Override
    public boolean update() {
        boolean retVal = true;
        for (Telemetry telemetry : telemetryList) {
            boolean temp = telemetry.update();
            retVal = retVal && temp;
        }
        return retVal;
    }

    @Override
    public Line addLine() {
        List<Line> lines = new ArrayList<>();
        for (Telemetry telemetry : telemetryList) {
            lines.add(telemetry.addLine());
        }
        return new MultipleLine(lines);
    }

    @Override
    public Line addLine(String s) {
        List<Line> lines = new ArrayList<>();
        for (Telemetry telemetry : telemetryList) {
            lines.add(telemetry.addLine(s));
        }
        return new MultipleLine(lines);
    }

    @Override
    public boolean removeLine(Line line) {
        boolean retVal = true;
        for (int i = 0; i < telemetryList.size(); i++) {
            Line own = line;
            if (line instanceof MultipleLine) {
                List<Line> lines = ((MultipleLine) line).lines;
                if (i >= lines.size()) {
                    break;
                }
                own = lines.get(i);
            }
            boolean temp = telemetryList.get(i).removeLine(own);
            retVal = retVal && temp;
        }
        return retVal;
    }

    @Override
    public boolean isAutoClear() {
        return telemetryList.get(0).isAutoClear();
    }

    @Override
    public void setAutoClear(boolean b) {
        for (Telemetry telemetry : telemetryList) {
            telemetry.setAutoClear(b);
        }
    }

    @Override
    public int getMsTransmissionInterval() {
        return telemetryList.get(0).getMsTransmissionInterval();
    }

    @Override
    public void setMsTransmissionInterval(int i) {
        for (Telemetry telemetry : telemetryList) {
            telemetry.setMsTransmissionInterval(i);
        }
    }

    @Override
    public String getItemSeparator() {
        return telemetryList.get(0).getItemSeparator();
    }

    @Override
    public void setItemSeparator(String s) {
        for (Telemetry telemetry : telemetryList) {
            telemetry.setItemSeparator(s);
        }
    }

    @Override
    public String getCaptionValueSeparator() {
        return telemetryList.get(0).getCaptionValueSeparator();
    }

    @Override
    public void setCaptionValueSeparator(String s) {
        for (Telemetry telemetry : telemetryList) {
            telemetry.setCaptionValueSeparator(s);
        }
    }

    // The interface default is a no-op that reaches neither delegate.
    @Override
    public void setNumDecimalPlaces(int minDecimalPlaces, int maxDecimalPlaces) {
        for (Telemetry telemetry : telemetryList) {
            telemetry.setNumDecimalPlaces(minDecimalPlaces, maxDecimalPlaces);
        }
    }

    @Override
    public void setDisplayFormat(DisplayFormat displayFormat) {
        for (Telemetry telemetry : telemetryList) {
            telemetry.setDisplayFormat(displayFormat);
        }
    }

    @Override
    public Log log() {
        return log;
    }

    public class MultipleItem implements Item {
        private List<Item> items;

        public MultipleItem(List<Item> items) {
            this.items = items;
        }

        @Override
        public String getCaption() {
            return this.items.get(0).getCaption();
        }

        @Override
        public Item setCaption(String s) {
            for (Item item : items) {
                item.setCaption(s);
            }
            return this;
        }

        @Override
        public Item setValue(String s, Object... objects) {
            for (Item item : items) {
                item.setValue(s, objects);
            }
            return this;
        }

        @Override
        public Item setValue(Object o) {
            for (Item item : items) {
                item.setValue(o);
            }
            return this;
        }

        @Override
        public <T> Item setValue(Func<T> func) {
            for (Item item : items) {
                item.setValue(func);
            }
            return this;
        }

        @Override
        public <T> Item setValue(String s, Func<T> func) {
            for (Item item : items) {
                item.setValue(s, func);
            }
            return this;
        }

        @Override
        public Item setRetained(@Nullable Boolean aBoolean) {
            for (Item item : items) {
                item.setRetained(aBoolean);
            }
            return this;
        }

        @Override
        public boolean isRetained() {
            return this.items.get(0).isRetained();
        }

        // Return the item, not `this`, or a chained addData() inserts relative to the wrong one.
        @Override
        public Item addData(String s, String s1, Object... objects) {
            List<Item> added = new ArrayList<>();
            for (Item item : items) {
                added.add(item.addData(s, s1, objects));
            }
            return new MultipleItem(added);
        }

        @Override
        public Item addData(String s, Object o) {
            List<Item> added = new ArrayList<>();
            for (Item item : items) {
                added.add(item.addData(s, o));
            }
            return new MultipleItem(added);
        }

        @Override
        public <T> Item addData(String s, Func<T> func) {
            List<Item> added = new ArrayList<>();
            for (Item item : items) {
                added.add(item.addData(s, func));
            }
            return new MultipleItem(added);
        }

        @Override
        public <T> Item addData(String s, String s1, Func<T> func) {
            List<Item> added = new ArrayList<>();
            for (Item item : items) {
                added.add(item.addData(s, s1, func));
            }
            return new MultipleItem(added);
        }
    }

    public class MultipleLine implements Line {
        private List<Line> lines;

        public MultipleLine(List<Line> lines) {
            this.lines = lines;
        }

        @Override
        public Item addData(String s, String s1, Object... objects) {
            List<Item> items = new ArrayList<>();
            for (Line line : lines) {
                items.add(line.addData(s, s1, objects));
            }
            return new MultipleItem(items);
        }

        @Override
        public Item addData(String s, Object o) {
            List<Item> items = new ArrayList<>();
            for (Line line : lines) {
                items.add(line.addData(s, o));
            }
            return new MultipleItem(items);
        }

        @Override
        public <T> Item addData(String s, Func<T> func) {
            List<Item> items = new ArrayList<>();
            for (Line line : lines) {
                items.add(line.addData(s, func));
            }
            return new MultipleItem(items);
        }

        @Override
        public <T> Item addData(String s, String s1, Func<T> func) {
            List<Item> items = new ArrayList<>();
            for (Line line : lines) {
                items.add(line.addData(s, s1, func));
            }
            return new MultipleItem(items);
        }
    }

    public class MultipleLog implements Log {
        private List<Log> logs;

        public MultipleLog() {
            logs = new ArrayList<>();
        }

        public void addLog(Log log) {
            this.logs.add(log);
        }

        @Override
        public int getCapacity() {
            return logs.get(0).getCapacity();
        }

        @Override
        public void setCapacity(int i) {
            for (Log log : logs) {
                log.setCapacity(i);
            }
        }

        @Override
        public DisplayOrder getDisplayOrder() {
            return logs.get(0).getDisplayOrder();
        }

        @Override
        public void setDisplayOrder(DisplayOrder displayOrder) {
            for (Log log : logs) {
                log.setDisplayOrder(displayOrder);
            }
        }

        @Override
        public void add(String s) {
            for (Log log : logs) {
                log.add(s);
            }
        }

        @Override
        public void add(String s, Object... objects) {
            for (Log log : logs) {
                log.add(s, objects);
            }
        }

        @Override
        public void clear() {
            for (Log log : logs) {
                log.clear();
            }
        }
    }
}
