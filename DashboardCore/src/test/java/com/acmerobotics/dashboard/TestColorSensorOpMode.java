package com.acmerobotics.dashboard;

import com.acmerobotics.dashboard.config.VariableProvider;
import com.acmerobotics.dashboard.config.variable.BasicVariable;
import com.acmerobotics.dashboard.config.variable.ConfigVariable;
import com.acmerobotics.dashboard.config.variable.CustomVariable;
import com.acmerobotics.dashboard.config.variable.VariableType;
import com.acmerobotics.dashboard.testopmode.TestOpMode;

/**
 * Drives the Color view without a robot: two fake I2C color sensors published under the variable
 * names {@code HardwareOpMode} uses, one sweeping the hue circle and one stepping between fixed
 * colors the expected-vs-sensed matching can be checked against.
 */
public class TestColorSensorOpMode extends TestOpMode {
    private static final String CATEGORY = "Color Sensors";
    private static final String SWEEP_SENSOR = "sweepSensor";
    private static final String STEP_SENSOR = "stepSensor";

    /** Raw count that the normalized readings report as 1.0. */
    private static final int FULL_SCALE = 4096;

    private static final int[][] STEP_COLORS = {
        {224, 32, 32},
        {34, 178, 76},
        {31, 111, 235},
        {242, 194, 48},
        {122, 63, 209},
        {255, 255, 255},
    };

    private TestDashboardInstance dashboard;
    private long startMillis;
    private long lastUpdate;

    public TestColorSensorOpMode() {
        super("TestColorSensorOpMode");
    }

    private static ConfigVariable<String> readOnly(Object value) {
        return new BasicVariable<>(
                VariableType.READONLY_STRING, new VariableProvider<>(String.valueOf(value)));
    }

    @Override
    protected void init() {
        dashboard = TestDashboardInstance.getInstance();
        startMillis = System.currentTimeMillis();
        lastUpdate = 0;

        dashboard.withHardwareRoot(
                hardwareRoot -> {
                    CustomVariable sensors = new CustomVariable();
                    sensors.putVariable(SWEEP_SENSOR, buildSensor(0, 0, 0, "0"));
                    sensors.putVariable(STEP_SENSOR, buildSensor(0, 0, 0, "1"));
                    hardwareRoot.putVariable(CATEGORY, sensors);
                });
    }

    @Override
    protected void loop() throws InterruptedException {
        long now = System.currentTimeMillis();
        // The hardware tree is pushed to every client on each update, so keep
        // the rate modest.
        if (now - lastUpdate < 100) {
            Thread.sleep(10);
            return;
        }
        lastUpdate = now;

        double seconds = (now - startMillis) / 1000.0;
        int[] sweep = hueToRgb((seconds * 36) % 360);
        int[] step = STEP_COLORS[((int) (seconds / 2)) % STEP_COLORS.length];

        dashboard.withHardwareRoot(
                hardwareRoot -> {
                    CustomVariable sensors = (CustomVariable) hardwareRoot.getVariable(CATEGORY);
                    if (sensors == null) {
                        return;
                    }

                    updateSensor(sensors, SWEEP_SENSOR, sweep);
                    updateSensor(sensors, STEP_SENSOR, step);
                });
    }

    @Override
    protected void stop() {
        dashboard.withHardwareRoot(hardwareRoot -> hardwareRoot.removeVariable(CATEGORY));
    }

    private void updateSensor(CustomVariable sensors, String name, int[] rgb) {
        CustomVariable existing = (CustomVariable) sensors.getVariable(name);
        if (existing == null) {
            return;
        }

        existing.update(buildState(rgb[0], rgb[1], rgb[2]));
    }

    /** Mirrors the variables that HardwareOpMode publishes for a real color sensor. */
    private CustomVariable buildSensor(int r, int g, int b, String port) {
        CustomVariable sensor = buildState(r, g, b);
        sensor.putVariable("Control Hub Port", readOnly(port));
        return sensor;
    }

    private CustomVariable buildState(int r, int g, int b) {
        // A surface at partial brightness, so the normalization modes differ.
        int rawR = r * FULL_SCALE / 255 / 3;
        int rawG = g * FULL_SCALE / 255 / 3;
        int rawB = b * FULL_SCALE / 255 / 3;
        int alpha = (rawR + rawG + rawB) / 3;

        CustomVariable state = new CustomVariable();
        state.putVariable("Red", readOnly(rawR));
        state.putVariable("Green", readOnly(rawG));
        state.putVariable("Blue", readOnly(rawB));
        state.putVariable("Alpha", readOnly(alpha));
        state.putVariable("Normalized Red", readOnly((float) rawR / FULL_SCALE));
        state.putVariable("Normalized Green", readOnly((float) rawG / FULL_SCALE));
        state.putVariable("Normalized Blue", readOnly((float) rawB / FULL_SCALE));
        state.putVariable("Normalized Alpha", readOnly((float) alpha / FULL_SCALE));
        return state;
    }

    private static int[] hueToRgb(double hue) {
        double h = hue / 60.0;
        double x = 1 - Math.abs(h % 2 - 1);

        double[] rgb;
        if (h < 1) {
            rgb = new double[] {1, x, 0};
        } else if (h < 2) {
            rgb = new double[] {x, 1, 0};
        } else if (h < 3) {
            rgb = new double[] {0, 1, x};
        } else if (h < 4) {
            rgb = new double[] {0, x, 1};
        } else if (h < 5) {
            rgb = new double[] {x, 0, 1};
        } else {
            rgb = new double[] {1, 0, x};
        }

        return new int[] {
            (int) Math.round(rgb[0] * 255),
            (int) Math.round(rgb[1] * 255),
            (int) Math.round(rgb[2] * 255),
        };
    }
}
