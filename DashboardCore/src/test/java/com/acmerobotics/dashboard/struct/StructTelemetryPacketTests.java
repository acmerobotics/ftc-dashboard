package com.acmerobotics.dashboard.struct;

import static org.junit.jupiter.api.Assertions.*;

import com.acmerobotics.dashboard.DashboardCore;
import com.acmerobotics.dashboard.message.redux.ReceiveTelemetry;
import com.acmerobotics.dashboard.telemetry.TelemetryPacket;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Tests for struct-based telemetry packing and serialization.
 */
public class StructTelemetryPacketTests {

    // --- Test data types ---
    static class Vector2d {
        final double x, y;
        Vector2d(double x, double y) { this.x = x; this.y = y; }
        @Override public boolean equals(Object o) {
            if (!(o instanceof Vector2d)) return false;
            Vector2d v = (Vector2d) o;
            return Double.compare(x, v.x) == 0 && Double.compare(y, v.y) == 0;
        }
    }

    static class Rotation2d {
        final double real, imag;
        Rotation2d(double real, double imag) { this.real = real; this.imag = imag; }
        @Override public boolean equals(Object o) {
            if (!(o instanceof Rotation2d)) return false;
            Rotation2d r = (Rotation2d) o;
            return Double.compare(real, r.real) == 0 && Double.compare(imag, r.imag) == 0;
        }
    }

    static class Pose2d {
        final Vector2d position; final Rotation2d heading;
        Pose2d(Vector2d p, Rotation2d h) { this.position = p; this.heading = h; }
        @Override public boolean equals(Object o) {
            if (!(o instanceof Pose2d)) return false;
            Pose2d p = (Pose2d) o;
            return position.equals(p.position) && heading.equals(p.heading);
        }
    }

    // --- Struct impls for the test ---
    static class Vector2dStruct implements Struct<Vector2d> {
        @Override public Class<Vector2d> getTypeClass() { return Vector2d.class; }
        @Override public String getTypeName() { return "test.Vector2d"; }
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
        @Override public String getTypeName() { return "test.Rotation2d"; }
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
        @Override public String getTypeName() { return "test.Pose2d"; }
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

    @Test
    void packsAndUnpacksPose2dLittleEndian() {
        Pose2dStruct struct = new Pose2dStruct();
        Pose2d pose = new Pose2d(new Vector2d(1.25, -2.5), new Rotation2d(0.0, 1.0));

        StructTelemetryPacket<Pose2d> pkt = new StructTelemetryPacket<>(struct, pose); // little-endian
        assertNotNull(pkt);
        assertEquals("test.Pose2d", pkt.structType);
        assertEquals(struct.getSchema(), pkt.structSchema);
        assertNotNull(pkt.structData);
        assertEquals(1, pkt.structData.size());
        assertEquals(struct.getSize(), pkt.structData.get(0).length);
        // Ensure nested includes Vector2d and Rotation2d
        List<String> nestedTypes = Arrays.stream(pkt.structNested).map(n -> n.type).collect(java.util.stream.Collectors.toList());
        assertTrue(nestedTypes.contains("test.Vector2d"));
        assertTrue(nestedTypes.contains("test.Rotation2d"));

        // Unpack with little-endian and check equality
        Pose2d decoded = struct.unpack(ByteBuffer.wrap(pkt.structData.get(0)).order(ByteOrder.LITTLE_ENDIAN));
        assertEquals(pose, decoded);
    }

    @Test
    void putApiAccumulatesMultipleStructs() {
        Vector2dStruct vec = new Vector2dStruct();
        StructTelemetryPacket<Vector2d> pkt = new StructTelemetryPacket<>();
        pkt.put(vec, new Vector2d(3.0, 4.0));
        pkt.put(vec, new Vector2d(-1.0, 2.5));

        assertEquals("test.Vector2d", pkt.structType);
        assertEquals(2, pkt.structData.size());
    }

    @Test
    void gsonSerializationIncludesStructFields() {
        Pose2dStruct struct = new Pose2dStruct();
        Pose2d pose = new Pose2d(new Vector2d(10, 20), new Rotation2d(0.5, -0.5));
        StructTelemetryPacket<Pose2d> pkt = new StructTelemetryPacket<>(struct, pose);
        // Wrap in the same envelope the server uses
        String json = DashboardCore.GSON.toJson(new ReceiveTelemetry(java.util.Arrays.asList(new TelemetryPacket[] { pkt })));
        // Simple sanity checks on JSON content
        assertTrue(json.contains("\"RECEIVE_TELEMETRY\""), json);
        assertTrue(json.contains("\"structData\""), json);
        assertTrue(json.contains("\"structType\""), json);
        assertTrue(json.contains("\"structSchema\""), json);
        assertTrue(json.contains(struct.getTypeName()), json);
        assertTrue(json.contains(struct.getSchema()), json);
    }
}
