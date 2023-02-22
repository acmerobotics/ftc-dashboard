package com.acmerobotics.roadrunner;

import com.acmerobotics.roadrunner.testopmode.TestOpMode;

public class TestSineWaveOpMode extends TestOpMode {
    TestDashboardInstance dashboard;
    public static double AMPLITUDE = 1;
    public static double PHASE = 90;
    public static double FREQUENCY = 0.25;


    public TestSineWaveOpMode(){
        super("TestSineWaveOpMode");
    }

    @Override
    protected void init() {
        dashboard = TestDashboardInstance.getInstance();
    }

    @Override
    protected void loop() throws InterruptedException {
        System.out.println(Math.sin(System.currentTimeMillis()));
        dashboard.addData("x", AMPLITUDE * Math.sin(
                2 * Math.PI * FREQUENCY * (System.currentTimeMillis() / 1000d) + Math.toRadians(PHASE)
        ));
        dashboard.update();
        Thread.sleep(1);
    }
}
