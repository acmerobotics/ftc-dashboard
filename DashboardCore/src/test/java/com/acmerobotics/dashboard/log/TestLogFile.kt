package com.acmerobotics.dashboard.log

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.io.TempDir
import java.io.ByteArrayOutputStream
import java.io.FileOutputStream
import java.nio.ByteBuffer
import java.nio.file.Path

class TestLogFile {

    // Test data classes for LogFile tests
    data class SimpleStruct(
        @JvmField val intField: Int,
        @JvmField val stringField: String,
        @JvmField val booleanField: Boolean
    )

    @Test
    fun testLogChannel() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)
        val channel = LogChannel("test", IntSchema)

        assertEquals("test", channel.name)
        assertEquals(IntSchema, channel.schema)

        assertDoesNotThrow {
            writer.write(channel, 42)
        }
    }

    @Test
    fun testLogChannelCreateFromClass() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)
        val channel = LogChannel.createFromClass("simple", SimpleStruct::class.java, writer)

        assertEquals("simple", channel.name)
        assertTrue(channel.schema is StructSchema<*>)
    }

    @Test
    fun testLogWriter() {
        val outputStream = ByteArrayOutputStream()
        LogWriter(outputStream)

        // Test header
        val writtenData = outputStream.toByteArray()
        assertTrue(writtenData.size >= 4)
        assertEquals('R'.code.toByte(), writtenData[0])
        assertEquals('R'.code.toByte(), writtenData[1])
        assertEquals(1.toShort(), ByteBuffer.wrap(writtenData, 2, 2).short)
    }

    @Test
    fun testLogWriterAddChannel() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)
        val channel = LogChannel("test", IntSchema)

        val addedChannel = writer.addChannel(channel)
        assertEquals(channel, addedChannel)

        // Test duplicate name rejection
        val duplicateChannel = LogChannel("test", LongSchema)
        assertThrows(IllegalArgumentException::class.java) {
            writer.addChannel(duplicateChannel)
        }
    }

    @Test
    fun testLogWriterWrite() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)
        val channel = LogChannel("test", IntSchema)

        // Writing should auto-register the channel
        assertDoesNotThrow {
            writer.write(channel, 42)
            writer.write(channel, 84)
        }

        // Test write by channel name
        assertDoesNotThrow {
            writer.write("test", 123)
        }

        // Test new channel creation by name
        assertDoesNotThrow {
            writer.write("newChannel", "hello")
        }
    }

    @Test
    fun testLogWriterIntegration(@TempDir tempDir: Path) {
        val logFile = tempDir.resolve("test.log").toFile()
        val writer = LogWriter(FileOutputStream(logFile))

        // Test various data types
        val intChannel = LogChannel.createFromClass("ints", Int::class.java, writer)
        val stringChannel = LogChannel.createFromClass("strings", String::class.java, writer)
        val structChannel = LogChannel.createFromClass("structs", SimpleStruct::class.java, writer)

        writer.use {
            writer.write(intChannel, 42)
            writer.write(stringChannel, "Hello")
            writer.write(structChannel, SimpleStruct(1, "test", true))

            writer.write(intChannel, 84)
            writer.write(stringChannel, "World")
            writer.write(structChannel, SimpleStruct(2, "another", false))
        }

        assertTrue(logFile.exists())
        assertTrue(logFile.length() > 0)
    }

    @Test
    fun testLogWriterChannelAutoRegistration() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)
        val channel = LogChannel("autoRegister", StringSchema)

        // Channel should be auto-registered on first write
        writer.write(channel, "test message")

        val writtenData = outputStream.toByteArray()
        assertTrue(writtenData.size > 4) // Header + schema entry + message entry
    }

    @Test
    fun testLogWriterMultipleChannels() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)

        val intChannel = LogChannel("ints", IntSchema)
        val stringChannel = LogChannel("strings", StringSchema)
        val boolChannel = LogChannel("bools", BooleanSchema)

        // Write data to multiple channels
        writer.write(intChannel, 42)
        writer.write(stringChannel, "hello")
        writer.write(boolChannel, true)
        writer.write(intChannel, 84)
        writer.write(stringChannel, "world")
        writer.write(boolChannel, false)

        val writtenData = outputStream.toByteArray()
        assertTrue(writtenData.size > 4) // Should contain header, schemas, and messages
    }

    @Test
    fun testLogWriterChannelIndexing() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)

        val channel1 = LogChannel("first", IntSchema)
        val channel2 = LogChannel("second", StringSchema)

        // Add channels explicitly to test indexing
        writer.addChannel(channel1)
        writer.addChannel(channel2)

        // Write to channels and verify they use correct indices
        assertDoesNotThrow {
            writer.write(channel1, 123)
            writer.write(channel2, "test")
        }
    }

    @Test
    fun testLogWriterBufferSizeCalculation() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)
        val channel = LogChannel("test", StringSchema)

        val testString = "This is a test string with UTF-8 characters: 🚀"

        assertDoesNotThrow {
            writer.write(channel, testString)
        }

        val writtenData = outputStream.toByteArray()
        assertTrue(writtenData.size > testString.toByteArray(Charsets.UTF_8).size)
    }

    @Test
    fun testLogWriterCloseAndFlush() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)
        val channel = LogChannel("test", IntSchema)

        writer.use {
            writer.write(channel, 42)
            writer.write(channel, 84)
        }

        // After closing, data should be available in the output stream
        val writtenData = outputStream.toByteArray()
        assertTrue(writtenData.size > 4) // Should contain header and data
    }

    @Test
    fun testLogChannelWithComplexTypes() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)

        data class ComplexStruct(
            @JvmField val id: Int,
            @JvmField val name: String,
            @JvmField val values: Array<Double>
        ) {
            override fun equals(other: Any?): Boolean {
                if (this === other) return true
                if (javaClass != other?.javaClass) return false
                other as ComplexStruct
                if (id != other.id) return false
                if (name != other.name) return false
                if (!values.contentEquals(other.values)) return false
                return true
            }

            override fun hashCode(): Int {
                var result = id
                result = 31 * result + name.hashCode()
                result = 31 * result + values.contentHashCode()
                return result
            }
        }

        val channel = LogChannel.createFromClass("complex", ComplexStruct::class.java, writer)
        val testData = ComplexStruct(1, "test", arrayOf(1.0, 2.0, 3.14))

        assertDoesNotThrow {
            writer.write(channel, testData)
        }

        val writtenData = outputStream.toByteArray()
        assertTrue(writtenData.size > 4)
    }

    @Test
    fun testLogWriterChannelNotFound() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)

        // Writing to a non-existent channel by name should create it automatically
        assertDoesNotThrow {
            writer.write("autoCreated", 42)
        }

        val writtenData = outputStream.toByteArray()
        assertTrue(writtenData.size > 4) // Should contain header, schema, and message
    }

    @Test
    fun testLogWriterAutoClose() {
        val outputStream = ByteArrayOutputStream()
        val channel = LogChannel("test", IntSchema)

        LogWriter(outputStream).use { writer ->
            writer.write(channel, 42)
        }

        // Data should be written even after auto-close
        val writtenData = outputStream.toByteArray()
        assertTrue(writtenData.size > 4)
    }

    @Test
    fun testLogChannelEquality() {
        val channel1 = LogChannel("test", IntSchema)
        val channel2 = LogChannel("test", IntSchema)
        val channel3 = LogChannel("different", IntSchema)

        // Channels with same name and schema should be equal in terms of functionality
        assertEquals(channel1.name, channel2.name)
        assertEquals(channel1.schema, channel2.schema)
        assertNotEquals(channel1.name, channel3.name)
    }
}
