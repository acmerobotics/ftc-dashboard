package com.acmerobotics.dashboard.struct;

import com.acmerobotics.dashboard.telemetry.TelemetryPacket;
import com.google.gson.annotations.SerializedName;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Telemetry packet carrying compact raw bytes for one or more values packed by Struct<T> implementations.
 *
 * <p>The packet exposes a `put(struct, value)` API mirroring TelemetryPacket.put so callers can
 * add struct values without relying on constructors. This packet is restricted to a single struct
 * type; its descriptor (type, schema, nested) lives on the packet itself and the payloads are a
 * map of base64-encoded byte arrays in {@code structData}.</p>
 */
public class StructTelemetryPacket<T> extends TelemetryPacket {
    /** Struct used at runtime for packing/unpacking. Not serialized. */
    public transient final Struct<T> struct;
    /** Packed samples for this struct type. Each entry is one value. */
    public final Map<String, byte[]> structData;

    /**
     * Minimal serializable descriptor for the struct type, exposed to the frontend as `struct`.
     */
    public static class StructDescriptor {
        public final String type;
        public final String schema;
        public final List<NestedType> nested;

        public StructDescriptor(Struct<?> s) {
            this.type = s.getTypeName();
            this.schema = s.getSchema();
            // Build nested list if available
            Struct<?>[] nestedArr;
            try {
                nestedArr = s.getNested();
            } catch (Throwable t) {
                nestedArr = null;
            }
            if (nestedArr == null) {
                this.nested = new ArrayList<>();
            } else {
                this.nested = new ArrayList<>(nestedArr.length);
                for (Struct<?> n : nestedArr) {
                    if (n != null) {
                        this.nested.add(new NestedType(n.getTypeName(), n.getSchema()));
                    }
                }
            }
        }
    }

    public static class NestedType {
        public final String type;
        public final String schema;

        public NestedType(String type, String schema) {
            this.type = type;
            this.schema = schema;
        }
    }

    /** Serializable view of the struct descriptor for the frontend. */
    @SerializedName("struct")
    public final StructDescriptor structDescriptor;

    /**
     * Creates an empty struct telemetry packet bound to a specific struct type.
     */
    public StructTelemetryPacket(Struct<T> struct) {
        super();
        this.structData = new TreeMap<>();
        this.struct = struct;
        this.structDescriptor = new StructDescriptor(struct);
    }

    /**
     * Creates a struct telemetry packet, packing the provided value using LITTLE_ENDIAN order.
     */
    public StructTelemetryPacket(Struct<T> struct, T value) {
        this(struct, value, ByteOrder.LITTLE_ENDIAN);
    }

    /**
     * Creates a struct telemetry packet with explicit byte order.
     */
    public StructTelemetryPacket(Struct<T> struct, T value, ByteOrder order) {
        this(struct);
        put("initial", value, order);
    }

    public void put(String key, T value, ByteOrder order) {
        ByteBuffer bb = ByteBuffer.allocate(struct.getSize()).order(order);
        struct.pack(bb, value);
        this.structData.put(key, bb.array());
    }

    @SuppressWarnings("unchecked")
    public void put(String key, Object value) {
        if (struct.getTypeClass().isInstance(value)) {
            T trueValue = (T) value;
            put(key, trueValue, ByteOrder.LITTLE_ENDIAN);
        } else {
            super.put(key, value);
        }
    }
}
