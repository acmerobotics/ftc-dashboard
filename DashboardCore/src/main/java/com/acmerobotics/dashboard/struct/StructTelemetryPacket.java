package com.acmerobotics.dashboard.struct;

import com.acmerobotics.dashboard.telemetry.TelemetryPacket;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.ArrayList;
import java.util.List;

/**
 * Telemetry packet carrying compact raw bytes for one or more values packed by Struct<T> implementations.
 *
 * <p>The packet exposes a `put(struct, value)` API mirroring TelemetryPacket.put so callers can
 * add struct values without relying on constructors. This packet is restricted to a single struct
 * type; its descriptor (type, schema, nested) lives on the packet itself and the payloads are a
 * list of byte arrays in {@code structData}.</p>
 */
public class StructTelemetryPacket<T> extends TelemetryPacket {
    /** Struct type name for all samples in this packet. */
    public String structType;
    /** Schema string for {@link #structType}. */
    public String structSchema;
    /** Optional nested struct descriptors referenced by {@link #structSchema}. */
    public NestedType[] structNested;
    /** Packed samples for this struct type. Each entry is one value. */
    public final List<byte[]> structData;

    // Optional reference to the struct type for this packet (helps with type inference/clarity)
    private final Struct<T> typeStruct;

    public static class NestedType {
        public final String type;
        public final String schema;

        public NestedType(String type, String schema) {
            this.type = type;
            this.schema = schema;
        }
    }

    /**
     * Creates an empty struct telemetry packet. Use put(struct, value) to add entries.
     */
    public StructTelemetryPacket() {
        super();
        this.structData = new ArrayList<>();
        this.typeStruct = null;
        this.structNested = new NestedType[0];
    }

    /**
     * Creates an empty struct telemetry packet bound to a specific struct type.
     */
    public StructTelemetryPacket(Struct<T> struct) {
        super();
        this.structData = new ArrayList<>();
        this.typeStruct = struct;
        this.structType = struct.getTypeName();
        this.structSchema = struct.getSchema();
        // Fill nested now for convenience
        setNestedFrom(struct);
    }

    /**
     * Creates a struct telemetry packet, packing the provided value using LITTLE_ENDIAN order.
     */
    public StructTelemetryPacket(Struct<T> struct, T value) {
        this(struct);
        put(struct, value, ByteOrder.LITTLE_ENDIAN);
    }

    /**
     * Creates a struct telemetry packet with explicit byte order.
     */
    public StructTelemetryPacket(Struct<T> struct, T value, ByteOrder order) {
        this(struct);
        put(struct, value, order);
    }

    private void setNestedFrom(Struct<?> struct) {
        Struct<?>[] nestedStructs = struct.getNested();
        if (nestedStructs != null && nestedStructs.length > 0) {
            NestedType[] nested = new NestedType[nestedStructs.length];
            for (int i = 0; i < nestedStructs.length; i++) {
                nested[i] = new NestedType(
                    nestedStructs[i].getTypeName(),
                    nestedStructs[i].getSchema()
                );
            }
            this.structNested = nested;
        } else {
            this.structNested = new NestedType[0];
        }
    }

    /**
     * Appends a struct-packed value using LITTLE_ENDIAN order.
     */
    public void put(Struct<T> struct, T value) {
        put(struct, value, ByteOrder.LITTLE_ENDIAN);
    }

    /**
     * Appends a struct-packed value with explicit byte order.
     */
    public void put(Struct<T> struct, T value, ByteOrder order) {
        // On first use, initialize the descriptor if not already set
        if (this.structType == null) {
            this.structType = struct.getTypeName();
            this.structSchema = struct.getSchema();
            setNestedFrom(struct);
        }

        // Pack value into bytes
        ByteBuffer bb = ByteBuffer.allocate(struct.getSize()).order(order);
        struct.pack(bb, value);
        byte[] bytes = bb.array();

        this.structData.add(bytes);
    }
}
