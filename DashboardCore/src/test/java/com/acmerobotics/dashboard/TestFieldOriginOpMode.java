package com.acmerobotics.dashboard;

import com.acmerobotics.dashboard.config.ValueProvider;
import com.acmerobotics.dashboard.telemetry.TelemetryPacket;
import com.acmerobotics.dashboard.testopmode.TestOpMode;


public class TestFieldOriginOpMode extends TestOpMode {
    TestDashboardInstance dashboard;
    public static double AMPLITUDE = 1;
    public static double PHASE = 90;
    public static double FREQUENCY = 0.25;
    public static double ORIGIN_OFFSET_X = 0;
    public static double ORIGIN_OFFSET_Y = 0;
    public static double ORIGIN_HEAD_ZERO = 0;
    public static boolean RED_ALLIANCE = true;
    public static double ORBITAL_FREQUENCY = 0.05;
    public static double SPIN_FREQUENCY = 0.25;

    public static double ORBITAL_RADIUS = 50;
    public static double SIDE_LENGTH = 10;

    private static void rotatePoints(double[] xPoints, double[] yPoints, double angle) {
        for (int i = 0; i < xPoints.length; i++) {
            double x = xPoints[i];
            double y = yPoints[i];
            xPoints[i] = x * Math.cos(angle) - y * Math.sin(angle);
            yPoints[i] = x * Math.sin(angle) + y * Math.cos(angle);
        }
    }

    public TestFieldOriginOpMode(){
        super("TestFieldOriginOpMode");
    }

    @Override
    protected void init() {
        dashboard = TestDashboardInstance.getInstance();
        dashboard.core.addConfigVariable("Test", "ORIGIN_HEADING_OFFSET", new ValueProvider<Double>() {
            private double x;

            @Override
            public Double get() {
                return x;
            }

            @Override
            public void set(Double value) {
                x = value;
            }
        });
        dashboard.core.addConfigVariable("Test", "RED_ALLIANCE", new ValueProvider<Boolean>() {
            private boolean red;

            @Override
            public Boolean get() {
                return red;
            }

            @Override
            public void set(Boolean value) {
                red = value;
            }
        });
    }

    @Override
    protected void loop() throws InterruptedException {
        System.out.println(Math.sin(System.currentTimeMillis()));
        double time = System.currentTimeMillis() / 1000d;

        double bx = ORBITAL_RADIUS * Math.cos(2 * Math.PI * ORBITAL_FREQUENCY * time);
        double by = ORBITAL_RADIUS * Math.sin(2 * Math.PI * ORBITAL_FREQUENCY * time);
        double l = SIDE_LENGTH / 2;
        //drawing an orbiting triangle pointing up the X axis to indicate field theta = 0
        double[] bxPoints = { 0, SIDE_LENGTH*2, 0 };
        double[] byPoints = { l, 0, -l };
        //rotatePoints(bxPoints, byPoints, 2 * Math.PI * SPIN_FREQUENCY * time);
        for (int i = 0; i < 3; i++) {
            bxPoints[i] += bx;
            byPoints[i] += by;
        }
        dashboard.addData("x", AMPLITUDE * Math.sin(
                2 * Math.PI * FREQUENCY * (System.currentTimeMillis() / 1000d) + Math.toRadians(PHASE)
        ));
        dashboard.update();

        //draw the field overlay
        TelemetryPacket packet = new TelemetryPacket();
        packet.fieldOverlay()
                //historical default origin for dashboard is in the center of the field with X axis pointing up
                //for powerplay season iron reign decided to set the origin to the alliance substation
                //to take advantage of the inherent symmetries of the challenge
                .setRotation(RED_ALLIANCE ? 0: Math.PI)
                .setOrigin(0, 12 * 6 * (RED_ALLIANCE ? -1: 1))
                //blue alliance would be
                //.setRotation(Math.PI)
                //.setOrigin(0, 12*6)
                //.setRotation(-Math.PI/4) //unlikely to want a rotation of 45 degrees, but test anyway

                .setStrokeWidth(1)
                //draw the origin
                .setStroke("red")
                .strokeLine(0,0,24,0) //x axis
                .setStroke("green")
                .strokeLine(0,0,0,24) //y axis
                .setStroke("goldenrod")
                .strokeCircle(0, 0, ORBITAL_RADIUS)
                .setFill("black")
                .fillPolygon(bxPoints, byPoints);
        dashboard.sendTelemetryPacket(packet);
        Thread.sleep(10);
    }
}
