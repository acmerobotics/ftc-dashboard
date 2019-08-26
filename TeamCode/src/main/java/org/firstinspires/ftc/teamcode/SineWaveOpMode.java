package org.firstinspires.ftc.teamcode;

import com.acmerobotics.dashboard.FtcDashboard;
import com.acmerobotics.dashboard.config.Config;
import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;

/*
 * Sine wave sample to demonstrate telemetry and config variables in action. Adjust the amplitude,
 * phase, and frequency of the oscillation and watch the changes propagate immediately to the graph.
 */
@Config
@Autonomous
public class SineWaveOpMode extends LinearOpMode {
    public static double AMPLITUDE = 10;
    public static double PHASE = 90;
    public static double FREQUENCY = 0.5;

    public static int TRANSMISSION_INTERVAL =
            FtcDashboard.getInstance().getTelemetryTransmissionInterval();

    @Override
    public void runOpMode() throws InterruptedException {
        FtcDashboard dashboard = FtcDashboard.getInstance();
        telemetry = dashboard.getTelemetry();

        waitForStart();

        if (isStopRequested()) return;

        while (opModeIsActive()) {
            dashboard.setTelemetryTransmissionInterval(TRANSMISSION_INTERVAL);

            telemetry.addData("x", AMPLITUDE * Math.sin(
                    2 * Math.PI * FREQUENCY * getRuntime() + Math.toRadians(PHASE)
            ));
            telemetry.update();
        }
    }
}
