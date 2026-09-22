package com.acmerobotics.dashboard;

import com.acmerobotics.dashboard.testopmode.TestOpMode;

public class TestSineWaveOpMode extends TestOpMode {
    TestDashboardInstance dashboard;
    public static double AMPLITUDE = 1;
    public static double PHASE = 90;
    public static double FREQUENCY = 0.25;

    private double lastX;

    public TestSineWaveOpMode() {
        super("TestSineWaveOpMode");
    }

    @Override
    protected void init() {
        dashboard = TestDashboardInstance.getInstance();
    }

    @Override
    protected void loop() throws InterruptedException {
        double x =
                AMPLITUDE
                        * Math.sin(
                                2 * Math.PI * FREQUENCY * (System.currentTimeMillis() / 1000d)
                                        + Math.toRadians(PHASE));

        dashboard.addData("x", x);

        if (lastX < 0 && x >= 0) {
            dashboard.addMarker("rising zero");
        }

        lastX = x;

        dashboard.update();
        Thread.sleep(10);
    }
}
