package com.acmerobotics.dashboard;

import com.acmerobotics.dashboard.testopmode.TestOpMode;

public class TestTelemetryOpMode extends TestOpMode {
    TestDashboardInstance dashboard;
    public static double AMPLITUDE = 1;
    public static double PHASE = 90;
    public static double FREQUENCY = 0.25;

    public TestTelemetryOpMode() {
        super("TestTelemetryOpMode");
    }

    @Override
    protected void init() {
        dashboard = TestDashboardInstance.getInstance();
    }

    @Override
    protected void loop() throws InterruptedException {
        double phase =
                2 * Math.PI * FREQUENCY * (System.currentTimeMillis() / 1000d)
                        + Math.toRadians(PHASE);
        double x = AMPLITUDE * Math.sin(phase);
        double y = AMPLITUDE * Math.cos(phase);

        dashboard.addData("x", x);
        dashboard.addData("y", y);
        dashboard.addData("heading", 180 * x);
        dashboard.addData("frontLeftMotorPower", 0.5 * x);
        dashboard.addData("frontRightMotorPower", -0.5 * x);
        dashboard.addData("backLeftMotorPower", 0.5 * y);
        dashboard.addData("backRightMotorPower", -0.5 * y);
        dashboard.addData("armPosition", Math.round(1000 * x));
        dashboard.addData("clawOpen", x > 0);
        dashboard.addData("batteryVoltage", 12.4 + 0.1 * y);

        dashboard.addLine("INFO: drive train nominal");
        dashboard.addLine(x > 0 ? "armPosition reached target" : "armPosition retracting");

        dashboard.update();
        Thread.sleep(10);
    }
}
