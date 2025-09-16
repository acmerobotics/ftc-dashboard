package com.acmerobotics.dashboard.log

import java.lang.reflect.Modifier
import java.nio.ByteBuffer

sealed interface EntrySchema<T> {

    /**
     * Unique identifier for the entry.
     */
    val tag: Int

    /**
     * Number of bytes used to store the schema.
     */
    val schemaSize: Int

    /**
     * Encodes the entry's schema into [buffer]. Must start with the schema [tag].
     * The default implementation writes the tag as an integer,
     * but this method should be overridden to include other information
     * for non-primitive schemas.
     */
    fun encodeSchema(buffer: ByteBuffer) {
        buffer.putInt(tag)
    }

    /**
     * The number of bytes used to store the object.
     */
    fun objSize(obj: T): Int

    /**
     * Encodes [obj] into [buffer].
     */
    fun encodeObject(buffer: ByteBuffer, obj: T)

    companion object {
        /**
         * Returns the schema for [clazz].
         */
        @Suppress("UNCHECKED_CAST")
        fun <T> schemaOfClass(clazz: Class<T>): EntrySchema<T> = when (clazz) {
            Int::class.java, Integer::class.java -> IntSchema
            Long::class.java, java.lang.Long::class.java -> LongSchema
            Double::class.java, java.lang.Double::class.java -> DoubleSchema
            String::class.java -> StringSchema
            Boolean::class.java, java.lang.Boolean::class.java -> BooleanSchema
            else -> {
                if (clazz.isEnum) {
                    @Suppress("UNCHECKED_CAST")
                    EnumSchema(clazz as Class<out Enum<*>>)
                } else if (clazz.isArray) {
                    ArraySchema(schemaOfClass(clazz.componentType!!))
                } else {
                    StructSchema.createFromClass(clazz)
                }
            }
        } as EntrySchema<T>
    }
}

object IntSchema : EntrySchema<Int> {
    override val tag: Int = 0
    override val schemaSize: Int = Int.SIZE_BYTES

    override fun objSize(obj: Int): Int = Int.SIZE_BYTES
    override fun encodeObject(buffer: ByteBuffer, obj: Int) {
        buffer.putInt(obj)
    }
}

object LongSchema : EntrySchema<Long> {
    override val tag: Int = 2
    override val schemaSize: Int = Int.SIZE_BYTES

    override fun objSize(obj: Long): Int = Long.SIZE_BYTES
    override fun encodeObject(buffer: ByteBuffer, obj: Long) {
        buffer.putLong(obj)
    }
}

object DoubleSchema : EntrySchema<Double> {
    override val tag: Int = 3
    override val schemaSize: Int = Int.SIZE_BYTES

    override fun objSize(obj: Double): Int = Double.SIZE_BYTES
    override fun encodeObject(buffer: ByteBuffer, obj: Double) {
        buffer.putDouble(obj)
    }
}

object StringSchema : EntrySchema<String> {
    override val tag: Int = 4
    override val schemaSize: Int = Int.SIZE_BYTES

    override fun objSize(obj: String): Int = Int.SIZE_BYTES + obj.toByteArray(Charsets.UTF_8).size

    override fun encodeObject(buffer: ByteBuffer, obj: String) {
        val bytes = obj.toByteArray(Charsets.UTF_8)
        buffer.putInt(bytes.size)
        buffer.put(bytes)
    }
}

object BooleanSchema : EntrySchema<Boolean> {
    override val tag: Int = 5
    override val schemaSize: Int = Int.SIZE_BYTES

    override fun objSize(obj: Boolean): Int = Byte.SIZE_BYTES
    override fun encodeObject(buffer: ByteBuffer, obj: Boolean) {
        buffer.put(if (obj) 1.toByte() else 0.toByte())
    }
}

class EnumSchema(val enumClass: Class<out Enum<*>>) : EntrySchema<Enum<*>> {
    init {
        require(enumClass.isEnum) { "Class must be an enum" }
    }

    override val tag: Int = 6

    override val schemaSize: Int = Int.SIZE_BYTES + Int.SIZE_BYTES + enumClass.enumConstants.sumOf { constant ->
        Int.SIZE_BYTES + constant.name.toByteArray(Charsets.UTF_8).size
    }

    override fun encodeSchema(buffer: ByteBuffer) {
        buffer.putInt(tag)
        val constants = enumClass.enumConstants
        buffer.putInt(constants.size)
        for (constant in constants) {
            val bytes = constant.name.toByteArray(Charsets.UTF_8)
            buffer.putInt(bytes.size)
            buffer.put(bytes)
        }
    }

    override fun objSize(obj: Enum<*>): Int = Int.SIZE_BYTES

    override fun encodeObject(buffer: ByteBuffer, obj: Enum<*>) {
        buffer.putInt(obj.ordinal)
    }
}

class ArraySchema<T>(val elementSchema: EntrySchema<T>) : EntrySchema<Array<T>> {
    override val tag: Int = 7

    override val schemaSize: Int = Int.SIZE_BYTES + elementSchema.schemaSize

    override fun encodeSchema(buffer: ByteBuffer) {
        buffer.putInt(tag)
        elementSchema.encodeSchema(buffer)
    }

    override fun objSize(obj: Array<T>): Int = Int.SIZE_BYTES + obj.sumOf {
        elementSchema.objSize(it)
    }

    fun cast(o: Any): Array<*> {
        return when (o) {
            is IntArray -> o.toTypedArray()
            is LongArray -> o.toTypedArray()
            is DoubleArray -> o.toTypedArray()
            is BooleanArray -> o.toTypedArray()
            is Array<*> -> o
            else -> throw IllegalArgumentException("unsupported array type: ${o.javaClass}")
        }
    }

    override fun encodeObject(buffer: ByteBuffer, obj: Array<T>) {
        buffer.putInt(obj.size)
        for (element in obj) {
            elementSchema.encodeObject(buffer, element)
        }
    }
}

class StructSchema<T>(
    val fields: Map<String, EntrySchema<*>>,
) : EntrySchema<T> {
    override val tag: Int = 0

    override val schemaSize: Int = Int.SIZE_BYTES + Int.SIZE_BYTES + fields.map { (name, schema) ->
        Int.SIZE_BYTES + name.toByteArray(Charsets.UTF_8).size + schema.schemaSize
    }.sum()

    override fun encodeSchema(buffer: ByteBuffer) {
        buffer.putInt(tag)
        buffer.putInt(fields.size)
        for ((name, schema) in fields) {
            val bytes = name.toByteArray(Charsets.UTF_8)
            buffer.putInt(bytes.size)
            buffer.put(bytes)
            schema.encodeSchema(buffer)
        }
    }

    override fun objSize(obj: T): Int = fields.map { (name, schema) ->
        val field = (obj as Any).javaClass.getField(name)
        val fieldValue = field.get(obj)!!
        @Suppress("UNCHECKED_CAST")
        (schema as EntrySchema<Any>).objSize(fieldValue)
    }.sum()

    override fun encodeObject(buffer: ByteBuffer, obj: T) {
        for ((name, schema) in fields) {
            val field = (obj as Any).javaClass.getField(name)
            val fieldValue = field.get(obj)!!
            @Suppress("UNCHECKED_CAST")
            (schema as EntrySchema<Any>).encodeObject(buffer, fieldValue)
        }
    }

    companion object {
        fun <T> createFromClass(cls: Class<T>): StructSchema<T> {
            //only use public instance fields
            val fields = cls.fields.filter {
                    !Modifier.isStatic(it.modifiers)
                }.associate { field ->
                    field.name to EntrySchema.schemaOfClass(field.type)
                }
            return StructSchema(fields)
        }
    }
}
