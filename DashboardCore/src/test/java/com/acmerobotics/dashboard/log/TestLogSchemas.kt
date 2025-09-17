package com.acmerobotics.dashboard.log

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import java.nio.ByteBuffer

class TestLogSchemas {

    // Test data classes and enums
    enum class TestEnum { FIRST, SECOND, THIRD }

    data class SimpleStruct(
        @JvmField val intField: Int,
        @JvmField val stringField: String,
        @JvmField val booleanField: Boolean
    )

    data class ComplexStruct(
        @JvmField val doubleField: Double,
        @JvmField val enumField: TestEnum,
        @JvmField val arrayField: Array<Int>
    ) {
        override fun equals(other: Any?): Boolean {
            if (this === other) return true
            if (javaClass != other?.javaClass) return false
            other as ComplexStruct
            if (doubleField != other.doubleField) return false
            if (enumField != other.enumField) return false
            if (!arrayField.contentEquals(other.arrayField)) return false
            return true
        }

        override fun hashCode(): Int {
            var result = doubleField.hashCode()
            result = 31 * result + enumField.hashCode()
            result = 31 * result + arrayField.contentHashCode()
            return result
        }
    }

    @Test
    fun testIntSchema() {
        val schema = IntSchema
        assertEquals(EntrySchema.Registry.INT.value, schema.tag)
        assertEquals(4, schema.schemaSize)
        assertEquals(4, schema.objSize(42))

        val buffer = ByteBuffer.allocate(8)
        schema.encodeSchema(buffer)
        schema.encodeObject(buffer, 42)
        buffer.flip()

        assertEquals(EntrySchema.Registry.INT.value, buffer.int)
        assertEquals(42, buffer.int)
    }

    @Test
    fun testLongSchema() {
        val schema = LongSchema
        assertEquals(EntrySchema.Registry.LONG.value, schema.tag)
        assertEquals(4, schema.schemaSize)
        assertEquals(8, schema.objSize(123456789L))

        val buffer = ByteBuffer.allocate(12)
        schema.encodeSchema(buffer)
        schema.encodeObject(buffer, 123456789L)
        buffer.flip()

        assertEquals(EntrySchema.Registry.LONG.value, buffer.int) // tag
        assertEquals(123456789L, buffer.long) // value
    }

    @Test
    fun testDoubleSchema() {
        val schema = DoubleSchema
        assertEquals(EntrySchema.Registry.DOUBLE.value, schema.tag)
        assertEquals(4, schema.schemaSize)
        assertEquals(8, schema.objSize(3.14159))

        val buffer = ByteBuffer.allocate(12)
        schema.encodeSchema(buffer)
        schema.encodeObject(buffer, 3.14159)
        buffer.flip()

        assertEquals(EntrySchema.Registry.DOUBLE.value, buffer.int) // tag
        assertEquals(3.14159, buffer.double, 1e-10) // value
    }

    @Test
    fun testStringSchema() {
        val schema = StringSchema
        val testString = "Hello, World!"
        assertEquals(EntrySchema.Registry.STRING.value, schema.tag)
        assertEquals(4, schema.schemaSize)
        assertEquals(4 + testString.toByteArray(Charsets.UTF_8).size, schema.objSize(testString))

        val buffer = ByteBuffer.allocate(4 + 4 + testString.toByteArray(Charsets.UTF_8).size)
        schema.encodeSchema(buffer)
        schema.encodeObject(buffer, testString)
        buffer.flip()

        assertEquals(EntrySchema.Registry.STRING.value, buffer.int) // tag
        val stringLength = buffer.int
        val stringBytes = ByteArray(stringLength)
        buffer.get(stringBytes)
        assertEquals(testString, String(stringBytes, Charsets.UTF_8))
    }

    @Test
    fun testBooleanSchema() {
        val schema = BooleanSchema
        assertEquals(EntrySchema.Registry.BOOLEAN.value, schema.tag)
        assertEquals(4, schema.schemaSize)
        assertEquals(1, schema.objSize(true))
        assertEquals(1, schema.objSize(false))

        // Test true
        val bufferTrue = ByteBuffer.allocate(5)
        schema.encodeSchema(bufferTrue)
        schema.encodeObject(bufferTrue, true)
        bufferTrue.flip()

        assertEquals(EntrySchema.Registry.BOOLEAN.value, bufferTrue.int) // tag
        assertEquals(1.toByte(), bufferTrue.get()) // true value

        // Test false
        val bufferFalse = ByteBuffer.allocate(5)
        schema.encodeSchema(bufferFalse)
        schema.encodeObject(bufferFalse, false)
        bufferFalse.flip()

        assertEquals(EntrySchema.Registry.BOOLEAN.value, bufferFalse.int) // tag
        assertEquals(0.toByte(), bufferFalse.get()) // false value
    }

    @Test
    fun testEnumSchema() {
        val schema = EnumSchema(TestEnum::class.java)
        assertEquals(EntrySchema.Registry.ENUM.value, schema.tag)
        assertEquals(4, schema.objSize(TestEnum.FIRST))
        assertEquals(4, schema.objSize(TestEnum.SECOND))

        val expectedSchemaSize = 4 + 4 + TestEnum.entries.sumOf {
            4 + it.name.toByteArray(Charsets.UTF_8).size
        }
        assertEquals(expectedSchemaSize, schema.schemaSize)

        val buffer = ByteBuffer.allocate(schema.schemaSize + schema.objSize(TestEnum.SECOND))
        schema.encodeSchema(buffer)
        schema.encodeObject(buffer, TestEnum.SECOND)
        buffer.flip()

        assertEquals(EntrySchema.Registry.ENUM.value, buffer.int) // tag
        assertEquals(3, buffer.int) // number of enum constants

        // Skip reading the enum constant names for brevity
        for (enumValue in TestEnum.entries) {
            val nameLength = buffer.int
            val nameBytes = ByteArray(nameLength)
            buffer.get(nameBytes)
            assertEquals(enumValue.name, String(nameBytes, Charsets.UTF_8))
        }

        assertEquals(TestEnum.SECOND.ordinal, buffer.int) // encoded enum value
    }

    @Test
    fun testArraySchema() {
        val elementSchema = IntSchema
        val schema = ArraySchema(elementSchema)
        val testArray = arrayOf(1, 2, 3, 4, 5)

        assertEquals(EntrySchema.Registry.ARRAY.value, schema.tag)
        assertEquals(4 + elementSchema.schemaSize, schema.schemaSize)
        assertEquals(4 + testArray.size * 4, schema.objSize(testArray))

        val buffer = ByteBuffer.allocate(schema.schemaSize + schema.objSize(testArray))
        schema.encodeSchema(buffer)
        schema.encodeObject(buffer, testArray)
        buffer.flip()

        assertEquals(EntrySchema.Registry.ARRAY.value, buffer.int) // tag
        assertEquals(EntrySchema.Registry.INT.value, buffer.int) // element schema tag (IntSchema)
        assertEquals(5, buffer.int) // array length
        for (i in testArray.indices) {
            assertEquals(testArray[i], buffer.int)
        }
    }

    @Test
    fun testArraySchemaCast() {
        val schema = ArraySchema(IntSchema)

        // Test various array types
        val intArray = intArrayOf(1, 2, 3)
        val longArray = longArrayOf(1L, 2L, 3L)
        val doubleArray = doubleArrayOf(1.0, 2.0, 3.0)
        val booleanArray = booleanArrayOf(true, false, true)
        val objectArray = arrayOf(1, 2, 3)

        assertDoesNotThrow { schema.cast(intArray) }
        assertDoesNotThrow { schema.cast(longArray) }
        assertDoesNotThrow { schema.cast(doubleArray) }
        assertDoesNotThrow { schema.cast(booleanArray) }
        assertDoesNotThrow { schema.cast(objectArray) }

        assertThrows(IllegalArgumentException::class.java) {
            schema.cast("not an array")
        }
    }

    @Test
    fun testReflectedClassSchema() {
        val schema = ReflectedClassSchema.createFromClass(SimpleStruct::class.java)
        val testStruct = SimpleStruct(42, "test", true)

        assertEquals(EntrySchema.Registry.REFLECTED_CLASS.value, schema.tag)
        assertEquals(3, schema.fields.size)
        assertTrue(schema.fields.containsKey("intField"))
        assertTrue(schema.fields.containsKey("stringField"))
        assertTrue(schema.fields.containsKey("booleanField"))

        val expectedObjSize = 4 + 4 + "test".toByteArray(Charsets.UTF_8).size + 1
        assertEquals(expectedObjSize, schema.objSize(testStruct))

        val buffer = ByteBuffer.allocate(schema.schemaSize + schema.objSize(testStruct))
        schema.encodeSchema(buffer)
        schema.encodeObject(buffer, testStruct)
        buffer.flip()

        assertEquals(EntrySchema.Registry.REFLECTED_CLASS.value, buffer.int) // tag
        assertEquals(3, buffer.int) // number of fields

        // Verify that fields are present (order may vary)
        val fieldNames = mutableSetOf<String>()
        repeat(3) {
            val nameLength = buffer.int
            val nameBytes = ByteArray(nameLength)
            buffer.get(nameBytes)
            fieldNames.add(String(nameBytes, Charsets.UTF_8))

            // Skip field schema
            val fieldTag = buffer.int
            when (fieldTag) {
                EntrySchema.Registry.INT.value -> {} // IntSchema - no additional data
                EntrySchema.Registry.STRING.value -> {} // StringSchema - no additional data
                EntrySchema.Registry.BOOLEAN.value -> {} // BooleanSchema - no additional data
            }
        }

        assertEquals(setOf("intField", "stringField", "booleanField"), fieldNames)
    }

    @Test
    fun testComplexReflectedClassSchema() {
        val schema = ReflectedClassSchema.createFromClass(ComplexStruct::class.java)
        val testStruct = ComplexStruct(3.14, TestEnum.SECOND, arrayOf(1, 2, 3))

        assertEquals(EntrySchema.Registry.REFLECTED_CLASS.value, schema.tag)
        assertEquals(3, schema.fields.size)

        assertDoesNotThrow {
            val objSize = schema.objSize(testStruct)
            assertTrue(objSize > 0)
        }

        assertDoesNotThrow {
            val buffer = ByteBuffer.allocate(1000) // Large buffer for complex schema
            schema.encodeSchema(buffer)
            schema.encodeObject(buffer, testStruct)
        }
    }

    @Test
    fun testSchemaOfClass() {
        // Test primitive types
        assertEquals(IntSchema, EntrySchema.schemaOfClass(Int::class.java))
        assertEquals(LongSchema, EntrySchema.schemaOfClass(Long::class.java))
        assertEquals(DoubleSchema, EntrySchema.schemaOfClass(Double::class.java))
        assertEquals(StringSchema, EntrySchema.schemaOfClass(String::class.java))
        assertEquals(BooleanSchema, EntrySchema.schemaOfClass(Boolean::class.java))

        // Test enum
        assertTrue(EntrySchema.schemaOfClass(TestEnum::class.java) is EnumSchema)

        // Test array
        assertTrue(EntrySchema.schemaOfClass(Array<Int>::class.java) is ArraySchema<*>)

        // Test struct
        assertTrue(EntrySchema.schemaOfClass(SimpleStruct::class.java) is ReflectedClassSchema<*>)
    }

    @Test
    fun testSchemaOfClassTypeCastSafety() {
        // Test that type casts in schemaOfClass don't fail with ClassCastException

        // Test primitive types and their boxed versions
        assertDoesNotThrow { EntrySchema.schemaOfClass(Int::class.java) }
        assertDoesNotThrow { EntrySchema.schemaOfClass(Integer::class.java) }
        assertDoesNotThrow { EntrySchema.schemaOfClass(Long::class.java) }
        assertDoesNotThrow { EntrySchema.schemaOfClass(java.lang.Long::class.java) }
        assertDoesNotThrow { EntrySchema.schemaOfClass(Double::class.java) }
        assertDoesNotThrow { EntrySchema.schemaOfClass(java.lang.Double::class.java) }
        assertDoesNotThrow { EntrySchema.schemaOfClass(Boolean::class.java) }
        assertDoesNotThrow { EntrySchema.schemaOfClass(java.lang.Boolean::class.java) }
        assertDoesNotThrow { EntrySchema.schemaOfClass(String::class.java) }

        // Test enum type cast - this tests the @Suppress("UNCHECKED_CAST") cast
        assertDoesNotThrow {
            val schema = EntrySchema.schemaOfClass(TestEnum::class.java)
            assertTrue(schema is EnumSchema)
            // Verify the enum schema was created correctly
            assertEquals(6, schema.tag)
        }

        // Test array type casts
        assertDoesNotThrow {
            val schema = EntrySchema.schemaOfClass(Array<Int>::class.java)
            assertTrue(schema is ArraySchema<*>)
            assertEquals(7, schema.tag)
        }

        assertDoesNotThrow {
            val schema = EntrySchema.schemaOfClass(Array<String>::class.java)
            assertTrue(schema is ArraySchema<*>)
        }

        assertDoesNotThrow {
            val schema = EntrySchema.schemaOfClass(Array<TestEnum>::class.java)
            assertTrue(schema is ArraySchema<*>)
        }

        // Test nested array type casts
        assertDoesNotThrow {
            val schema = EntrySchema.schemaOfClass(Array<Array<Int>>::class.java)
            assertTrue(schema is ArraySchema<*>)
        }

        // Test struct type cast - this tests the final `as EntrySchema<T>` cast
        assertDoesNotThrow {
            val schema = EntrySchema.schemaOfClass(SimpleStruct::class.java)
            assertTrue(schema is ReflectedClassSchema<*>)
            assertEquals(0, schema.tag)
        }

        assertDoesNotThrow {
            val schema = EntrySchema.schemaOfClass(ComplexStruct::class.java)
            assertTrue(schema is ReflectedClassSchema<*>)
        }

        // Test that the returned schemas can actually be used without casting issues
        val intSchema = EntrySchema.schemaOfClass(Int::class.java)
        assertDoesNotThrow { intSchema.objSize(42) }
        assertDoesNotThrow {
            val buffer = ByteBuffer.allocate(4)
            intSchema.encodeObject(buffer, 42)
        }

        val enumSchema = EntrySchema.schemaOfClass(TestEnum::class.java)
        assertDoesNotThrow { enumSchema.objSize(TestEnum.FIRST) }
        assertDoesNotThrow {
            val buffer = ByteBuffer.allocate(4)
            enumSchema.encodeObject(buffer, TestEnum.FIRST)
        }

        val arraySchema = EntrySchema.schemaOfClass(Array<String>::class.java)
        val testArray = arrayOf("test1", "test2")
        assertDoesNotThrow { arraySchema.objSize(testArray) }
        assertDoesNotThrow {
            val buffer = ByteBuffer.allocate(100)
            arraySchema.encodeObject(buffer, testArray)
        }

        val structSchema = EntrySchema.schemaOfClass(SimpleStruct::class.java)
        val testStruct = SimpleStruct(1, "test", true)
        assertDoesNotThrow { structSchema.objSize(testStruct) }
        assertDoesNotThrow {
            val buffer = ByteBuffer.allocate(100)
            structSchema.encodeObject(buffer, testStruct)
        }
    }

    @Test
    fun testSchemaConsistency() {
        // Test that objSize is consistent for the same type
        val schema = ReflectedClassSchema.createFromClass(SimpleStruct::class.java)
        val obj1 = SimpleStruct(1, "test", true)
        val obj2 = SimpleStruct(2, "test", false)

        // Same string length should give same object size
        assertEquals(schema.objSize(obj1), schema.objSize(obj2))

        val obj3 = SimpleStruct(3, "different", true)
        // Different string length should give different object size
        assertNotEquals(schema.objSize(obj1), schema.objSize(obj3))
    }

    @Test
    fun testEncodingRoundTrip() {
        // Test that we can encode and measure sizes correctly
        val testCases = listOf(
            IntSchema to 42,
            LongSchema to 123456789L,
            DoubleSchema to 3.14159,
            StringSchema to "Hello, World!",
            BooleanSchema to true
        )

        for ((schema, obj) in testCases) {
            when (schema) {
                is IntSchema -> {
                    val objSize = schema.objSize(obj as Int)
                    val buffer = ByteBuffer.allocate(objSize)
                    schema.encodeObject(buffer, obj)
                    assertEquals(0, buffer.remaining(), "Object size mismatch for IntSchema")
                }
                is LongSchema -> {
                    val objSize = schema.objSize(obj as Long)
                    val buffer = ByteBuffer.allocate(objSize)
                    schema.encodeObject(buffer, obj)
                    assertEquals(0, buffer.remaining(), "Object size mismatch for LongSchema")
                }
                is DoubleSchema -> {
                    val objSize = schema.objSize(obj as Double)
                    val buffer = ByteBuffer.allocate(objSize)
                    schema.encodeObject(buffer, obj)
                    assertEquals(0, buffer.remaining(), "Object size mismatch for DoubleSchema")
                }
                is StringSchema -> {
                    val objSize = schema.objSize(obj as String)
                    val buffer = ByteBuffer.allocate(objSize)
                    schema.encodeObject(buffer, obj)
                    assertEquals(0, buffer.remaining(), "Object size mismatch for StringSchema")
                }
                is BooleanSchema -> {
                    val objSize = schema.objSize(obj as Boolean)
                    val buffer = ByteBuffer.allocate(objSize)
                    schema.encodeObject(buffer, obj)
                    assertEquals(0, buffer.remaining(), "Object size mismatch for BooleanSchema")
                }
                else -> {
                    fail("Unexpected schema type: ${schema::class.java.simpleName}")
                }
            }
        }

        // Test enum schema separately
        val enumSchema = EnumSchema(TestEnum::class.java)
        val enumObj = TestEnum.SECOND
        val enumObjSize = enumSchema.objSize(enumObj)
        val enumBuffer = ByteBuffer.allocate(enumObjSize)
        enumSchema.encodeObject(enumBuffer, enumObj)
        assertEquals(0, enumBuffer.remaining(), "Object size mismatch for EnumSchema")
    }

    @Test
    fun testUtf8StringEncoding() {
        val schema = StringSchema
        val utf8String = "Hello 🌍 UTF-8!"
        val expectedSize = 4 + utf8String.toByteArray(Charsets.UTF_8).size

        assertEquals(expectedSize, schema.objSize(utf8String))

        val buffer = ByteBuffer.allocate(schema.schemaSize + schema.objSize(utf8String))
        schema.encodeSchema(buffer)
        schema.encodeObject(buffer, utf8String)
        buffer.flip()

        assertEquals(4, buffer.int) // tag
        val stringLength = buffer.int
        val stringBytes = ByteArray(stringLength)
        buffer.get(stringBytes)
        assertEquals(utf8String, String(stringBytes, Charsets.UTF_8))
    }

    @Test
    fun testEmptyArraySchema() {
        val schema = ArraySchema(StringSchema)
        val emptyArray = arrayOf<String>()

        assertEquals(4, schema.objSize(emptyArray)) // Just the size field

        val buffer = ByteBuffer.allocate(schema.objSize(emptyArray))
        schema.encodeObject(buffer, emptyArray)
        buffer.flip()

        assertEquals(0, buffer.int) // array size
    }

    @Test
    fun testNestedReflectedClassSchema() {
        data class NestedStruct(
            @JvmField val simple: SimpleStruct,
            @JvmField val id: Int
        )

        val schema = ReflectedClassSchema.createFromClass(NestedStruct::class.java)
        val testObj = NestedStruct(SimpleStruct(1, "nested", true), 42)

        assertEquals(0, schema.tag)
        assertEquals(2, schema.fields.size)
        assertTrue(schema.fields.containsKey("simple"))
        assertTrue(schema.fields.containsKey("id"))

        assertDoesNotThrow {
            val objSize = schema.objSize(testObj)
            assertTrue(objSize > 0)

            val buffer = ByteBuffer.allocate(objSize)
            schema.encodeObject(buffer, testObj)
            assertEquals(0, buffer.remaining())
        }
    }
}