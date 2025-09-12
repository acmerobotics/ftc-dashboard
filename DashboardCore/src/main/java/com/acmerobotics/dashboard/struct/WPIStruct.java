// Copyright (c) FIRST and other WPILib contributors.
// Open Source Software; you can modify and/or share it under the terms of
// the WPILib BSD license file in the root directory of this project.
package com.acmerobotics.dashboard.struct;

import java.lang.reflect.Array;
import java.nio.ByteBuffer;

/**
 * Utilities and interface for raw struct serialization.
 */
public class WPIStruct {
    /** Serialized size of a "bool" value. */
    public static final int BOOL_SIZE = 1;

    /** Serialized size of an "int8" or "uint8" value. */
    public static final int INT8_SIZE = 1;

    /** Serialized size of an "int16" or "uint16" value. */
    public static final int INT16_SIZE = 2;

    /** Serialized size of an "int32" or "uint32" value. */
    public static final int INT32_SIZE = 4;

    /** Serialized size of an "int64" or "uint64" value. */
    public static final int INT64_SIZE = 8;

    /** Serialized size of a "float" or "float32" value. */
    public static final int FLOAT_SIZE = 4;

    /** Serialized size of a "double" or "float64" value. */
    public static final int DOUBLE_SIZE = 8;

    /**
     * Deserializes an array from a raw struct serialized ByteBuffer starting at the current position.
     * Will increment the ByteBuffer position by size * struct.getSize() bytes. Will not otherwise modify
     * the ByteBuffer (e.g. byte order will not be changed).
     *
     * @param <T> Object type
     * @param bb ByteBuffer
     * @param size Size of the array
     * @param struct Struct implementation
     * @return Deserialized array
     */
    @SuppressWarnings("unchecked")
    public static <T> T[] unpackArray(ByteBuffer bb, int size, Struct<T> struct) {
        T[] arr = (T[]) Array.newInstance(struct.getTypeClass(), size);
        for (int i = 0; i < arr.length; i++) {
            arr[i] = struct.unpack(bb);
        }
        return arr;
    }

    /**
     * Deserializes a double array from a raw struct serialized ByteBuffer starting at the current
     * position. Will increment the ByteBuffer position by size * DOUBLE_SIZE bytes. Will not
     * otherwise modify the ByteBuffer (e.g. byte order will not be changed).
     *
     * @param bb ByteBuffer
     * @param size Size of the array
     * @return Double array
     */
    public static double[] unpackDoubleArray(ByteBuffer bb, int size) {
        double[] arr = new double[size];
        for (int i = 0; i < size; i++) {
            arr[i] = bb.getDouble();
        }
        return arr;
    }

    /**
     * Puts array contents to a ByteBuffer starting at the current position. Will increment the
     * ByteBuffer position by size * struct.getSize() bytes. Will not otherwise modify the ByteBuffer
     * (e.g. byte order will not be changed).
     *
     * @param <T> Object type
     * @param bb ByteBuffer
     * @param arr Array to serialize
     * @param struct Struct implementation
     */
    public static <T> void packArray(ByteBuffer bb, T[] arr, Struct<T> struct) {
        for (T obj : arr) {
            struct.pack(bb, obj);
        }
    }

    /**
     * Puts array contents to a ByteBuffer starting at the current position. Will increment the
     * ByteBuffer position by size * DOUBLE_SIZE bytes. Will not otherwise modify the ByteBuffer (e.g.
     * byte order will not be changed).
     *
     * @param bb ByteBuffer
     * @param arr Array to serialize
     */
    public static void packDoubleArray(ByteBuffer bb, double[] arr) {
        for (double obj : arr) {
            bb.putDouble(obj);
        }
    }

}
