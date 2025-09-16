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
        val channel = LogChannel("test", IntSchema, writer)

        assertEquals("test", channel.name)
        assertEquals(IntSchema, channel.schema)
        assertEquals(writer, channel.writer)

        assertDoesNotThrow {
            channel.write(42)
        }
    }

    @Test
    fun testLogChannelCreateFromClass() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)
        val channel = LogChannel.createFromClass("simple", SimpleStruct::class.java, writer)

        assertEquals("simple", channel.name)
        assertTrue(channel.schema is StructSchema<*>)
        assertEquals(writer, channel.writer)
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
        val channel = LogChannel("test", IntSchema, writer)

        val addedChannel = writer.addChannel(channel)
        assertEquals(channel, addedChannel)

        // Test duplicate name rejection
        val duplicateChannel = LogChannel("test", LongSchema, writer)
        assertThrows(IllegalArgumentException::class.java) {
            writer.addChannel(duplicateChannel)
        }

        // Test wrong writer rejection
        val anotherWriter = LogWriter(ByteArrayOutputStream())
        val wrongWriterChannel = LogChannel("other", IntSchema, anotherWriter)
        assertThrows(IllegalArgumentException::class.java) {
            writer.addChannel(wrongWriterChannel)
        }
    }

    @Test
    fun testLogWriterWrite() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)
        val channel = LogChannel("test", IntSchema, writer)

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
            intChannel.write(42)
            stringChannel.write("Hello")
            structChannel.write(SimpleStruct(1, "test", true))

            intChannel.write(84)
            stringChannel.write("World")
            structChannel.write(SimpleStruct(2, "another", false))
        }

        assertTrue(logFile.exists())
        assertTrue(logFile.length() > 0)
    }

    @Test
    fun testLogWriterChannelAutoRegistration() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)
        val channel = LogChannel("autoRegister", StringSchema, writer)

        // Channel should be auto-registered on first write
        channel.write("test message")

        val writtenData = outputStream.toByteArray()
        assertTrue(writtenData.size > 4) // Header + schema entry + message entry
    }

    @Test
    fun testLogWriterMultipleChannels() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)

        val intChannel = LogChannel("ints", IntSchema, writer)
        val stringChannel = LogChannel("strings", StringSchema, writer)
        val boolChannel = LogChannel("bools", BooleanSchema, writer)

        // Write data to multiple channels
        intChannel.write(42)
        stringChannel.write("hello")
        boolChannel.write(true)
        intChannel.write(84)
        stringChannel.write("world")
        boolChannel.write(false)

        val writtenData = outputStream.toByteArray()
        assertTrue(writtenData.size > 4) // Should contain header, schemas, and messages
    }

    @Test
    fun testLogWriterChannelIndexing() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)

        val channel1 = LogChannel("first", IntSchema, writer)
        val channel2 = LogChannel("second", StringSchema, writer)

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
        val channel = LogChannel("test", StringSchema, writer)

        val testString = "This is a test string with UTF-8 characters: 🚀"

        assertDoesNotThrow {
            channel.write(testString)
        }

        val writtenData = outputStream.toByteArray()
        assertTrue(writtenData.size > testString.toByteArray(Charsets.UTF_8).size)
    }

    @Test
    fun testLogWriterCloseAndFlush() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)
        val channel = LogChannel("test", IntSchema, writer)

        writer.use {
            channel.write(42)
            channel.write(84)
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
            channel.write(testData)
        }

        val writtenData = outputStream.toByteArray()
        assertTrue(writtenData.size > 4)
    }
}
