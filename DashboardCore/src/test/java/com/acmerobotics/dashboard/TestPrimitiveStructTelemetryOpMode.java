package com.acmerobotics.dashboard;

import com.acmerobotics.dashboard.canvas.Canvas;
import com.acmerobotics.dashboard.struct.Struct;
import com.acmerobotics.dashboard.struct.StructTelemetryPacket;
import com.acmerobotics.dashboard.struct.WPIStruct;
import com.acmerobotics.dashboard.testopmode.TestOpMode;
import java.nio.ByteBuffer;

/**
 * Test opmode that emits a struct containing all primitive field types supported by the
 * dashboard struct decoder. Intended for manual visual verification in the Telemetry view.
 */
public class TestPrimitiveStructTelemetryOpMode extends TestOpMode {
    private TestDashboardInstance dashboard;

    // Data holder for our primitive fields
    static class Prims {
        final boolean b;   // bool
        final byte c;      // char (single byte)
        final byte i8;     // int8
        final short u8;    // uint8 stored in wider type
        final short i16;   // int16
        final int u16;     // uint16 stored in wider type
        final int i32;     // int32
        final int u32;     // uint32 (raw bits of int)
        final long i64;    // int64
        final long u64;    // uint64 (raw bits of long)
        final float f;     // float32
        final double d;    // float64

        Prims(boolean b, byte c, byte i8, short u8, short i16, int u16,
              int i32, int u32, long i64, long u64, float f, double d) {
            this.b = b; this.c = c; this.i8 = i8; this.u8 = u8; this.i16 = i16; this.u16 = u16;
            this.i32 = i32; this.u32 = u32; this.i64 = i64; this.u64 = u64; this.f = f; this.d = d;
        }
    }

    // Struct with all primitives in a fixed order
    static class PrimsStruct implements Struct<Prims> {
        @Override public Class<Prims> getTypeClass() { return Prims.class; }
        @Override public String getTypeName() { return "demo.Prims"; }
        @Override public int getSize() {
            // bool(1) + char(1) + int8(1) + uint8(1) + int16(2) + uint16(2) + int32(4) + uint32(4)
            // + int64(8) + uint64(8) + float(4) + double(8) = 44 bytes
            return (WPIStruct.BOOL_SIZE) + (WPIStruct.INT8_SIZE) + (WPIStruct.INT8_SIZE) + (WPIStruct.INT8_SIZE)
                + (WPIStruct.INT16_SIZE) + (WPIStruct.INT16_SIZE) + (WPIStruct.INT32_SIZE) + (WPIStruct.INT32_SIZE)
                + (WPIStruct.INT64_SIZE) + (WPIStruct.INT64_SIZE) + (WPIStruct.FLOAT_SIZE) + (WPIStruct.DOUBLE_SIZE);
        }
        @Override public String getSchema() {
            return "bool b;char c;int8 i8;uint8 u8;int16 i16;uint16 u16;int32 i32;uint32 u32;int64 i64;uint64 u64;float f;double d";
        }
        @Override public Prims unpack(ByteBuffer bb) {
            boolean b = (bb.get() & 0xFF) != 0;
            byte c = bb.get();
            byte i8 = bb.get();
            short u8 = (short) (bb.get() & 0xFF);
            short i16 = bb.getShort();
            int u16 = bb.getShort() & 0xFFFF;
            int i32 = bb.getInt();
            int u32 = bb.getInt(); // raw bits; interpreted as unsigned by frontend
            long i64 = bb.getLong();
            long u64 = bb.getLong(); // raw bits; interpreted as unsigned by frontend
            float f = bb.getFloat();
            double d = bb.getDouble();
            return new Prims(b, c, i8, u8, i16, u16, i32, u32, i64, u64, f, d);
        }
        @Override public void pack(ByteBuffer bb, Prims v) {
            bb.put((byte) (v.b ? 1 : 0));
            bb.put(v.c);
            bb.put(v.i8);
            bb.put((byte) (v.u8 & 0xFF));
            bb.putShort(v.i16);
            bb.putShort((short) (v.u16 & 0xFFFF));
            bb.putInt(v.i32);
            bb.putInt(v.u32); // raw bits
            bb.putLong(v.i64);
            bb.putLong(v.u64); // raw bits
            bb.putFloat(v.f);
            bb.putDouble(v.d);
        }
        @Override public boolean isImmutable() { return true; }
    }

    private PrimsStruct primsStruct;
    private long t0;

    public TestPrimitiveStructTelemetryOpMode() {
        super("TestPrimitiveStructTelemetryOpMode");
    }

    @Override
    protected void init() {
        dashboard = TestDashboardInstance.getInstance();
        primsStruct = new PrimsStruct();
        t0 = System.currentTimeMillis();
    }

    @Override
    protected void loop() throws InterruptedException {
        double t = (System.currentTimeMillis() - t0) / 1000.0;
        boolean b = ((long) t) % 2 == 0;
        byte c = (byte) ('A' + ((int) t % 26));
        byte i8 = (byte) -120;
        short u8 = (short) 250; // 0xFA
        short i16 = (short) -30000;
        int u16 = 60000; // 0xEA60
        int i32 = 0x89ABCDEF; // negative when interpreted as signed
        int u32 = 0xF0E1D2C3; // large unsigned
        long i64 = -9_876_543_210L;
        long u64 = 0xF0E1D2C3B4A59687L; // large unsigned (raw bits)
        float f = (float) (Math.sin(t) * 123.456);
        double d = -2.718281828459045;

        Prims prims = new Prims(b, c, i8, u8, i16, u16, i32, u32, i64, u64, f, d);

        StructTelemetryPacket<Prims> pkt = new StructTelemetryPacket<>(primsStruct);
        pkt.put("prims", prims);

        // Also add a few human-readable values alongside
        pkt.put("char", String.valueOf((char)(c & 0xFF)));
        pkt.put("uint8", String.valueOf(u8 & 0xFF));
        pkt.put("uint16", String.valueOf(u16 & 0xFFFF));

        // Draw a simple indicator so the opmode is visibly alive
        Canvas cvs = pkt.fieldOverlay();
        cvs.setStroke("#ffaa00");
        cvs.setStrokeWidth(2);
        float r = 3 + (float) (2 * (0.5 + 0.5 * Math.sin(t)));
        cvs.strokeCircle(10 + 5 * Math.cos(t), 10 + 5 * Math.sin(t), r);

        dashboard.sendTelemetryPacket(pkt);

        Thread.sleep(50);
    }
}
