package org.firstinspires.ftc.teamcode;

import com.acmerobotics.dashboard.FtcDashboard;
import com.acmerobotics.dashboard.config.Config;
import com.acmerobotics.dashboard.config.VariableProvider;
import com.acmerobotics.dashboard.config.variable.BasicVariable;
import com.acmerobotics.dashboard.config.variable.ConfigVariable;
import com.acmerobotics.dashboard.config.variable.CustomVariable;
import com.acmerobotics.dashboard.config.variable.VariableType;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;

/**
 * Two fake color sensors, named as {@code HardwareOpMode} names them, for trying
 * the Color view on a bare Control Hub: one sweeps the hue circle, one holds
 * {@link #FIXED_R}/{@link #FIXED_G}/{@link #FIXED_B}. Removed on stop.
 */
@Config
@TeleOp(name = "Color View Demo", group = "dash-test")
public class ColorViewDemoOpMode extends LinearOpMode {
    public static double SWEEP_PERIOD_S = 12.0;

    public static int FIXED_R = 31;
    public static int FIXED_G = 111;
    public static int FIXED_B = 235;

    /** Simulated surface brightness, 0-1. Lower values stress normalization. */
    public static double BRIGHTNESS = 0.35;

    /** Raw count that the normalized readings report as 1.0. */
    private static final int FULL_SCALE = 4096;

    private static final String CATEGORY = "Color Sensors (demo)";
    private static final String SWEEP = "sweep";
    private static final String FIXED = "fixed";

    private static ConfigVariable<String> ro(Object value) {
        return new BasicVariable<>(
            VariableType.READONLY_STRING, new VariableProvider<>(String.valueOf(value)));
    }

    @Override
    public void runOpMode() {
        FtcDashboard dashboard = FtcDashboard.getInstance();

        dashboard.withHardwareRoot(hardwareRoot -> {
            CustomVariable sensors = new CustomVariable();
            sensors.putVariable(SWEEP, buildSensor(new int[] {0, 0, 0}, "0"));
            sensors.putVariable(FIXED, buildSensor(new int[] {0, 0, 0}, "1"));
            hardwareRoot.putVariable(CATEGORY, sensors);
        });

        telemetry.addLine("Add a Color view, then press start.");
        telemetry.update();

        waitForStart();

        try {
            long startMs = System.currentTimeMillis();

            while (opModeIsActive()) {
                double seconds = (System.currentTimeMillis() - startMs) / 1000.0;
                double hue = SWEEP_PERIOD_S <= 0
                    ? 0
                    : (seconds / SWEEP_PERIOD_S * 360.0) % 360.0;

                int[] sweepRgb = hueToRgb(hue);
                int[] fixedRgb = {clamp8(FIXED_R), clamp8(FIXED_G), clamp8(FIXED_B)};

                dashboard.withHardwareRoot(hardwareRoot -> {
                    CustomVariable sensors =
                        (CustomVariable) hardwareRoot.getVariable(CATEGORY);
                    if (sensors == null) {
                        return;
                    }
                    updateSensor(sensors, SWEEP, sweepRgb);
                    updateSensor(sensors, FIXED, fixedRgb);
                });

                telemetry.addData("sweep hue", "%.0f deg", hue);
                telemetry.addData("fixed rgb", "%d, %d, %d",
                    fixedRgb[0], fixedRgb[1], fixedRgb[2]);
                telemetry.update();

                sleep(100);
            }
        } finally {
            dashboard.withHardwareRoot(hardwareRoot ->
                hardwareRoot.removeVariable(CATEGORY));
        }
    }

    private void updateSensor(CustomVariable sensors, String name, int[] rgb) {
        CustomVariable existing = (CustomVariable) sensors.getVariable(name);
        if (existing != null) {
            existing.update(buildState(rgb));
        }
    }

    /** Mirrors HardwareOpMode: state variables plus a hub port. */
    private CustomVariable buildSensor(int[] rgb, String port) {
        CustomVariable sensor = buildState(rgb);
        sensor.putVariable("Control Hub Port", ro(port));
        return sensor;
    }

    private CustomVariable buildState(int[] rgb) {
        double scale = Math.max(0.01, BRIGHTNESS) * FULL_SCALE / 255.0 / 3.0;
        int rawR = (int) Math.round(rgb[0] * scale);
        int rawG = (int) Math.round(rgb[1] * scale);
        int rawB = (int) Math.round(rgb[2] * scale);
        int alpha = (rawR + rawG + rawB) / 3;

        CustomVariable state = new CustomVariable();
        state.putVariable("Red", ro(rawR));
        state.putVariable("Green", ro(rawG));
        state.putVariable("Blue", ro(rawB));
        state.putVariable("Alpha", ro(alpha));
        state.putVariable("Normalized Red", ro((float) rawR / FULL_SCALE));
        state.putVariable("Normalized Green", ro((float) rawG / FULL_SCALE));
        state.putVariable("Normalized Blue", ro((float) rawB / FULL_SCALE));
        state.putVariable("Normalized Alpha", ro((float) alpha / FULL_SCALE));
        return state;
    }

    private static int clamp8(int v) {
        return Math.max(0, Math.min(255, v));
    }

    private static int[] hueToRgb(double hue) {
        double h = hue / 60.0;
        double x = 1 - Math.abs(h % 2 - 1);

        double r;
        double g;
        double b;
        if (h < 1) {
            r = 1; g = x; b = 0;
        } else if (h < 2) {
            r = x; g = 1; b = 0;
        } else if (h < 3) {
            r = 0; g = 1; b = x;
        } else if (h < 4) {
            r = 0; g = x; b = 1;
        } else if (h < 5) {
            r = x; g = 0; b = 1;
        } else {
            r = 1; g = 0; b = x;
        }

        return new int[] {
            (int) Math.round(r * 255),
            (int) Math.round(g * 255),
            (int) Math.round(b * 255),
        };
    }
}
