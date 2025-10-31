package com.acmerobotics.dashboard.struct;

import java.nio.ByteBuffer;

/**
 * Interface for raw struct serialization.
 *
 * <p>This is designed for serializing small fixed-size data structures in the fastest and most
 * compact means possible. Serialization consists of making relative put() calls to a ByteBuffer and
 * deserialization consists of making relative get() calls from a ByteBuffer.
 *
 * <p>Idiomatically, classes that support raw struct serialization should provide a static final
 * member named "struct" that provides an instance of an implementation of this interface.
 *
 * @param <T> object type
 */
public interface Struct<T> {
    /**
     * Gets the Class object for the stored value.
     *
     * @return Class
     */
    Class<T> getTypeClass();

    /**
     * Gets the type name (e.g. for schemas of other structs). This should be globally unique among
     * structs.
     *
     * @return type name
     */
    String getTypeName();

    /**
     * Gets the type string (e.g. for NetworkTables). This should be globally unique and start with
     * "struct:".
     *
     * @return type string
     */
    default String getTypeString() {
        return "struct:" + getTypeName();
    }

    /**
     * Gets the serialized size (in bytes). This should always be a constant.
     *
     * @return serialized size
     */
    int getSize();

    /**
     * Gets the schema.
     *
     * @return schema
     */
    String getSchema();

    /**
     * Gets the list of struct types referenced by this struct.
     *
     * @return list of struct types
     */
    default Struct<?>[] getNested() {
        return new Struct<?>[0];
    }

    /**
     * Deserializes an object from a raw struct serialized ByteBuffer starting at the current
     * position. Will increment the ByteBuffer position by getSize() bytes. Will not otherwise
     * modify the ByteBuffer (e.g. byte order will not be changed).
     *
     * @param bb ByteBuffer
     * @return New object
     */
    T unpack(ByteBuffer bb);

    /**
     * Puts object contents to a ByteBuffer starting at the current position. Will increment the
     * ByteBuffer position by getSize() bytes. Will not otherwise modify the ByteBuffer (e.g.
     * byte order will not be changed).
     *
     * @param bb    ByteBuffer
     * @param value object to serialize
     */
    void pack(ByteBuffer bb, T value);

    /**
     * Updates object contents from a raw struct serialized ByteBuffer starting at the current
     * position. Will increment the ByteBuffer position by getSize() bytes. Will not otherwise
     * modify the ByteBuffer (e.g. byte order will not be changed).
     *
     * <p>Immutable classes cannot and should not implement this function. The default implementation
     * throws UnsupportedOperationException.
     *
     * @param out object to update
     * @param bb  ByteBuffer
     * @throws UnsupportedOperationException if the object is immutable
     */
    default void unpackInto(T out, ByteBuffer bb) {
        throw new UnsupportedOperationException("object does not support unpackInto");
    }

    /**
     * Returns whether objects are immutable. Immutable objects must also be comparable using
     * the equals() method. The default implementation returns false.
     *
     * @return True if object is immutable
     */
    default boolean isImmutable() {
        return false;
    }

    /**
     * Returns whether objects are cloneable using the clone() method. Cloneable objects must
     * also be comparable using the equals() method. Default implementation returns false.
     *
     * @return True if object is cloneable
     */
    default boolean isCloneable() {
        return false;
    }

    /**
     * Creates a (deep) clone of the object. May also return the object directly if the object is
     * immutable. The default implementation throws CloneNotSupportedException. Typically this should be
     * implemented by implementing clone() on the object itself and calling it from here.
     *
     * @param obj object to clone
     * @return Clone of an object (if immutable, may be the same object)
     * @throws CloneNotSupportedException if clone isn't supported
     */
    default T clone(T obj) throws CloneNotSupportedException {
        throw new CloneNotSupportedException();
    }
}
