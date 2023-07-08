package com.acmerobotics.dashboard;

import com.acmerobotics.dashboard.config.ValueProvider;
import com.acmerobotics.dashboard.telemetry.TelemetryPacket;
import com.acmerobotics.dashboard.testopmode.TestOpMode;


public class TestFieldVersatilityOpMode extends TestOpMode {
    TestDashboardInstance dashboard;
    public static double AMPLITUDE = 1;
    public static double PHASE = 90;
    public static double FREQUENCY = 0.25;
    public static double ORIGIN_OFFSET_X = 0;
    public static double ORIGIN_OFFSET_Y = 12 * 6;
    public static double ORIGIN_ZEROHEADING = Math.PI/2;
    public static boolean RED_ALLIANCE = true;
    public static double ORBITAL_FREQUENCY = 0.05;
    public static double SPIN_FREQUENCY = 0.25;
    public static double ORBITAL_RADIUS = 50;
    public static double SIDE_LENGTH = 10;
    public static String ALTIMGSRC = "https://upload.wikimedia.org/wikipedia/commons/4/45/Football_field.svg";
    public static double ALTIMGX = 0; //try 24
    public static double ALTIMGY = 0; //try 24
    public static double ALTIMGW = 144; //try 48
    public static double ALTIMGH = 144; //try 48
    public static boolean ALTIMGOPAQUE = true;
    public static double SCALEX = 1.0;
    public static double SCALEY = 1.0;
    public static double GRIDHORIZONTAL = 7; //includes field edges
    public static double GRIDVERTICAL = 7;

    private static void rotatePoints(double[] xPoints, double[] yPoints, double angle) {
        for (int i = 0; i < xPoints.length; i++) {
            double x = xPoints[i];
            double y = yPoints[i];
            xPoints[i] = x * Math.cos(angle) - y * Math.sin(angle);
            yPoints[i] = x * Math.sin(angle) + y * Math.cos(angle);
        }
    }

    public TestFieldVersatilityOpMode(){
        super("TestFieldVersatilityOpMode");
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
                //optionally add an alternate field image on top of the default
                .setAltImage(ALTIMGSRC, ALTIMGX, ALTIMGY,ALTIMGW, ALTIMGH, ALTIMGOPAQUE)
                //.setAltImage("", 0, 0,144, 144, false) //empty src will clear the alt field image

                //optionally override default gridlines, minimum of 2 to render field edges, anything less suppresses gridlines in that direction, default is 7
                .setGrid(GRIDHORIZONTAL, GRIDVERTICAL)

                //historical default origin for dashboard is in the center of the field with X axis pointing up
                //for powerplay season iron reign decided to set the origin to the alliance substation
                //to take advantage of the inherent symmetries of the challenge:
                .setRotation(RED_ALLIANCE ? 0: Math.PI)
                .setTranslation(ORIGIN_OFFSET_X, ORIGIN_OFFSET_Y * (RED_ALLIANCE ? -1: 1))
                //blue alliance would be
                //.setRotation(Math.PI)
                //.setTranslation(0, 12*6)

                //.setRotation(-Math.PI/4) //uncomment to see a rotation of 45 degrees, there have been challenges with a diagonal field symmetry

                .setScale(SCALEX, SCALEY) //be sure the vales evaluate to a doubles and not ints
                //.setScale(144.0/105,144.0/105) //example of FIFA soccer field in meters

                .setStrokeWidth(1)
                //draw the axes of the new origin
                .setStroke("red")
                .strokeLine(0,0,24,0) //x axis
                .setFill("red")
                .fillText("X axis", 0, 0,"8px Arial", 0)
                .setStroke("green")
                .strokeLine(0,0,0,24) //y axis
                .setFill("green")
                .strokeText("Y axis", (RED_ALLIANCE? -24: 0), 0,"8px serif", Math.PI/2 * (RED_ALLIANCE? -1: 1))
                .setStroke("goldenrod")
                .strokeCircle(0, 0, ORBITAL_RADIUS)
                .setFill("black")
                .fillPolygon(bxPoints, byPoints);
        dashboard.sendTelemetryPacket(packet);
        Thread.sleep(10);
    }
}
