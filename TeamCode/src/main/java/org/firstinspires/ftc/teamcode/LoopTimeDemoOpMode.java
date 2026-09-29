package org.firstinspires.ftc.teamcode;

import com.acmerobotics.dashboard.FtcDashboard;
import com.acmerobotics.dashboard.config.Config;
import com.acmerobotics.dashboard.telemetry.LoopTimer;
import com.acmerobotics.dashboard.telemetry.TelemetryPacket;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;

/**
 * Feeds the Loop Time view a synthetic four-stage loop on a bare Control Hub,
 * spiking vision every {@link #SPIKE_EVERY} loops (0 disables). Setup is in
 * docs/features.md.
 */
@Config
@TeleOp(name = "Loop Time Demo", group = "dash-test")
public class LoopTimeDemoOpMode extends LinearOpMode {
    public static double SENSORS_MS = 2.0;
    public static double VISION_MS = 6.0;
    public static double CONTROL_MS = 2.5;
    public static double HARDWARE_MS = 4.0;

    public static int SPIKE_EVERY = 40;
    public static double SPIKE_MS = 22.0;

    public static long REPORT_PERIOD_MS = 50;

    @Override
    public void runOpMode() {
        FtcDashboard dashboard = FtcDashboard.getInstance();
        LoopTimer timer = new LoopTimer();

        telemetry.addLine("Add a Loop Time view, then press start.");
        telemetry.update();

        waitForStart();

        long lastReport = System.currentTimeMillis();
        int iteration = 0;

        while (opModeIsActive()) {
            timer.startLoop();

            timer.beginSegment("sensors");
            busyWaitMillis(SENSORS_MS);

            timer.beginSegment("vision");
            boolean spiking = SPIKE_EVERY > 0 && iteration % SPIKE_EVERY == 0;
            busyWaitMillis(spiking ? SPIKE_MS : VISION_MS);

            timer.beginSegment("control");
            busyWaitMillis(CONTROL_MS);

            timer.beginSegment("hardware");
            busyWaitMillis(HARDWARE_MS);

            timer.endLoop();
            iteration++;

            long now = System.currentTimeMillis();
            if (now - lastReport >= REPORT_PERIOD_MS) {
                TelemetryPacket packet = new TelemetryPacket(false);
                timer.addTo(packet);
                dashboard.sendTelemetryPacket(packet);
                lastReport = now;
            }
        }
    }

    private static void busyWaitMillis(double millis) {
        if (millis <= 0) {
            return;
        }
        long deadline = System.nanoTime() + (long) (millis * 1e6);
        while (System.nanoTime() < deadline) {
            // Spin.
        }
    }
}
