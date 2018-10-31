package org.firstinspires.ftc.teamcode;

import com.acmerobotics.dashboard.FtcDashboard;
import com.acmerobotics.dashboard.config.Config;
import com.acmerobotics.dashboard.telemetry.TelemetryPacket;
import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;

/*
 * Demonstration of the dashboard's field overlay display capabilities.
 */
@Config
@Autonomous
public class OrbitOpMode extends LinearOpMode {
    public static double ORBITAL_FREQUENCY = 20;
    public static double SPIN_FREQUENCY = 2;

    public static double ORBITAL_RADIUS = 50;
    public static double SIDE_LENGTH = 6;

    private static void rotatePoints(double[] xPoints, double[] yPoints, double angle) {
        for (int i = 0; i < xPoints.length; i++) {
            double x = xPoints[i];
            double y = yPoints[i];
            xPoints[i] = x * Math.cos(angle) - y * Math.sin(angle);
            yPoints[i] = x * Math.sin(angle) + y * Math.cos(angle);
        }
    }

    @Override
    public void runOpMode() throws InterruptedException {
        FtcDashboard dashboard = FtcDashboard.getInstance();

        waitForStart();

        if (isStopRequested()) return;

        while (opModeIsActive()) {
            double time = getRuntime();

            double bx = ORBITAL_RADIUS * Math.cos(2 * Math.PI * ORBITAL_FREQUENCY * time);
            double by = ORBITAL_RADIUS * Math.sin(2 * Math.PI * ORBITAL_FREQUENCY * time);
            double l = SIDE_LENGTH / 2;

            double[] bxPoints = { bx + l, bx - l, bx - l, bx + l };
            double[] byPoints = { by + l, by + l, by - l, by - l };
            rotatePoints(bxPoints, byPoints, 2 * Math.PI * SPIN_FREQUENCY * time);

            TelemetryPacket packet = new TelemetryPacket();
            packet.fieldOverlay()
                    .setStroke("goldenrod")
                    .strokeCircle(0, 0, ORBITAL_RADIUS)
                    .setFill("black")
                    .fillPolygon(bxPoints, byPoints);
            dashboard.sendTelemetryPacket(packet);
        }
    }
}
