package com.acmerobotics.dashboard;

import com.acmerobotics.dashboard.canvas.Canvas;
import com.acmerobotics.dashboard.struct.Struct;
import com.acmerobotics.dashboard.struct.StructTelemetryPacket;
import com.acmerobotics.dashboard.struct.WPIStruct;
import com.acmerobotics.dashboard.testopmode.TestOpMode;
import java.nio.ByteBuffer;

/**
 * TestDashboard opmode that emits raw Struct telemetry (Vector2d, Rotation2d, Pose2d)
 * and draws a simple overlay so it can be verified via the browser Telemetry + Field views.
 *
 * This mirrors the TeamCode StructTelemetryDemoOpMode but runs in the DashboardCore test harness.
 */
public class TestStructTelemetryOpMode extends TestOpMode {
    private TestDashboardInstance dashboard;

    // --- Demo data types ---
    static class Vector2d {
        final double x, y;
        Vector2d(double x, double y) { this.x = x; this.y = y; }
    }

    static class Rotation2d {
        final double real, imag; // unit complex (cos, sin)
        Rotation2d(double real, double imag) { this.real = real; this.imag = imag; }
    }

    static class Pose2d {
        final Vector2d position; final Rotation2d heading;
        Pose2d(Vector2d p, Rotation2d h) { this.position = p; this.heading = h; }
    }

    // --- Struct implementations matching schemas used by the frontend ---
    static class Vector2dStruct implements Struct<Vector2d> {
        @Override public Class<Vector2d> getTypeClass() { return Vector2d.class; }
        @Override public String getTypeName() { return "demo.Vector2d"; }
        @Override public int getSize() { return 2 * WPIStruct.DOUBLE_SIZE; }
        @Override public String getSchema() { return "double x;double y"; }
        @Override public Vector2d unpack(ByteBuffer bb) {
            double x = bb.getDouble();
            double y = bb.getDouble();
            return new Vector2d(x, y);
        }
        @Override public void pack(ByteBuffer bb, Vector2d v) {
            bb.putDouble(v.x);
            bb.putDouble(v.y);
        }
        @Override public boolean isImmutable() { return true; }
    }

    static class Rotation2dStruct implements Struct<Rotation2d> {
        @Override public Class<Rotation2d> getTypeClass() { return Rotation2d.class; }
        @Override public String getTypeName() { return "demo.Rotation2d"; }
        @Override public int getSize() { return 2 * WPIStruct.DOUBLE_SIZE; }
        @Override public String getSchema() { return "double real;double imag"; }
        @Override public Rotation2d unpack(ByteBuffer bb) {
            double r = bb.getDouble();
            double i = bb.getDouble();
            return new Rotation2d(r, i);
        }
        @Override public void pack(ByteBuffer bb, Rotation2d v) {
            bb.putDouble(v.real);
            bb.putDouble(v.imag);
        }
        @Override public boolean isImmutable() { return true; }
    }

    static class Pose2dStruct implements Struct<Pose2d> {
        private final Vector2dStruct vec = new Vector2dStruct();
        private final Rotation2dStruct rot = new Rotation2dStruct();
        @Override public Class<Pose2d> getTypeClass() { return Pose2d.class; }
        @Override public String getTypeName() { return "demo.Pose2d"; }
        @Override public int getSize() { return vec.getSize() + rot.getSize(); }
        @Override public String getSchema() { return "Vector2d position;Rotation2d heading"; }
        @Override public Struct<?>[] getNested() { return new Struct<?>[] { vec, rot }; }
        @Override public Pose2d unpack(ByteBuffer bb) {
            Vector2d p = vec.unpack(bb);
            Rotation2d h = rot.unpack(bb);
            return new Pose2d(p, h);
        }
        @Override public void pack(ByteBuffer bb, Pose2d v) {
            vec.pack(bb, v.position);
            rot.pack(bb, v.heading);
        }
        @Override public boolean isImmutable() { return true; }
    }

    private Pose2dStruct poseStruct;
    private long t0;

    public TestStructTelemetryOpMode() {
        super("TestStructTelemetryOpMode");
    }

    @Override
    protected void init() {
        dashboard = TestDashboardInstance.getInstance();
        poseStruct = new Pose2dStruct();
        t0 = System.currentTimeMillis();
    }

    @Override
    protected void loop() throws InterruptedException {
        double t = (System.currentTimeMillis() - t0) / 1000.0;

        // Generate a simple Lissajous-style trajectory on a 144x144 field (inches)
        double cx = 0, cy = 0;
        double ax = 50, ay = 50;
        double x = cx + ax * Math.cos(t * 0.6);
        double y = cy + ay * Math.sin(t * 0.8);
        double heading = Math.atan2(ay * 0.8 * Math.cos(t * 0.8), -ax * 0.6 * Math.sin(t * 0.6));
        Rotation2d rot = new Rotation2d(Math.cos(heading), Math.sin(heading));
        Pose2d pose = new Pose2d(new Vector2d(x, y), rot);

        StructTelemetryPacket<Pose2d> pkt = new StructTelemetryPacket<>(poseStruct);
        pkt.put("pose", pose);
        pkt.put("x", String.format("%.2f", x));
        pkt.put("y", String.format("%.2f", y));
        pkt.put("headingDeg", String.format("%.1f", Math.toDegrees(heading)));

        Canvas c = pkt.fieldOverlay();
        c.setStroke("#00ff88");
        c.setStrokeWidth(2);
        c.strokeCircle(x, y, 2.5);
        double len = 8.0;
        double hx = x + len * Math.cos(heading);
        double hy = y + len * Math.sin(heading);
        c.strokeLine(x, y, hx, hy);

        dashboard.sendTelemetryPacket(pkt);

        Thread.sleep(33);
    }
}
