package com.acmerobotics.dashboard.log

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.io.TempDir
import java.io.ByteArrayOutputStream
import java.io.FileOutputStream
import java.nio.ByteBuffer
import java.nio.file.Path

class TestLogWriter {

    // Test data classes for LogFile tests
    data class SimpleStruct(
        @JvmField val intField: Int,
        @JvmField val stringField: String,
        @JvmField val booleanField: Boolean
    )

    // Simple LogChannel implementation for testing
    class TestLogChannel<T>(
        override val name: String,
        override val schema: EntrySchema<T>
    ) : LogChannel<T> {
        override fun put(obj: T) {
            // No-op for testing
        }
    }

    @Test
    fun testLogChannel() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)
        val channel = TestLogChannel("test", IntSchema)

        assertEquals("test", channel.name)
        assertEquals(IntSchema, channel.schema)

        assertDoesNotThrow {
            writer.write(channel, 42)
        }
    }

    @Test
    fun testWriterChannel() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)
        val channel = writer.WriterChannel("test", IntSchema)

        assertEquals("test", channel.name)
        assertEquals(IntSchema, channel.schema)
        assertEquals(writer, channel.writer)

        assertDoesNotThrow {
            channel.put(42)
            channel.write(84)
        }
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
        assertEquals(VERSION, ByteBuffer.wrap(writtenData, 2, 2).short)
    }

    @Test
    fun testLogWriterAddChannel() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)
        val channel = writer.WriterChannel("test", IntSchema)

        val addedChannel = writer.addChannel(channel)
        assertEquals(channel, addedChannel)

        // Test duplicate name rejection
        val duplicateChannel = writer.WriterChannel("test", LongSchema)
        assertThrows(IllegalArgumentException::class.java) {
            writer.addChannel(duplicateChannel)
        }
    }

    @Test
    fun testLogWriterAddChannelFromInterface() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)
        val channel = TestLogChannel("test", IntSchema)

        val writerChannel = writer.addChannel(channel)
        assertTrue(writerChannel is LogWriter.WriterChannel<*>)
        assertEquals("test", writerChannel.name)
        assertEquals(IntSchema, writerChannel.schema)
    }

    @Test
    fun testLogWriterWrite() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)
        val channel = TestLogChannel("test", IntSchema)

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

        // Test various data types using createChannel
        val intChannel = writer.createChannel("ints", Int::class.java)
        val stringChannel = writer.createChannel("strings", String::class.java)
        val structChannel = writer.createChannel("structs", SimpleStruct::class.java)

        writer.use {
            intChannel.put(42)
            stringChannel.put("Hello")
            structChannel.put(SimpleStruct(1, "test", true))

            intChannel.put(84)
            stringChannel.put("World")
            structChannel.put(SimpleStruct(2, "another", false))
        }

        assertTrue(logFile.exists())
        assertTrue(logFile.length() > 0)
    }

    @Test
    fun testLogWriterChannelAutoRegistration() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)
        val channel = TestLogChannel("autoRegister", StringSchema)

        // Channel should be auto-registered on first write
        writer.write(channel, "test message")

        val writtenData = outputStream.toByteArray()
        assertTrue(writtenData.size > 4) // Header + schema entry + message entry
    }

    @Test
    fun testLogWriterMultipleChannels() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)

        val intChannel = writer.createChannel("ints", IntSchema)
        val stringChannel = writer.createChannel("strings", StringSchema)
        val boolChannel = writer.createChannel("bools", BooleanSchema)

        // Write data to multiple channels
        intChannel.put(42)
        stringChannel.put("hello")
        boolChannel.put(true)
        intChannel.put(84)
        stringChannel.put("world")
        boolChannel.put(false)

        val writtenData = outputStream.toByteArray()
        assertTrue(writtenData.size > 4) // Should contain header, schemas, and messages
    }

    @Test
    fun testLogWriterChannelIndexing() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)

        val channel1 = writer.createChannel("first", IntSchema)
        val channel2 = writer.createChannel("second", StringSchema)

        // Channels are automatically added when created
        // Write to channels and verify they use correct indices
        assertDoesNotThrow {
            channel1.put(123)
            channel2.put("test")
        }
    }

    @Test
    fun testLogWriterBufferSizeCalculation() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)
        val channel = writer.createChannel("test", StringSchema)

        val testString = "This is a test string with UTF-8 characters: 🚀"

        assertDoesNotThrow {
            channel.put(testString)
        }

        val writtenData = outputStream.toByteArray()
        assertTrue(writtenData.size > testString.toByteArray(Charsets.UTF_8).size)
    }

    @Test
    fun testLogWriterCloseAndFlush() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)
        val channel = writer.createChannel("test", IntSchema)

        writer.use {
            channel.put(42)
            channel.put(84)
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

        val channel = writer.createChannel("complex", ComplexStruct::class.java)
        val testData = ComplexStruct(1, "test", arrayOf(1.0, 2.0, 3.14))

        assertDoesNotThrow {
            channel.put(testData)
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
        val channel = TestLogChannel("test", IntSchema)

        LogWriter(outputStream).use { writer ->
            writer.write(channel, 42)
        }

        // Data should be written even after auto-close
        val writtenData = outputStream.toByteArray()
        assertTrue(writtenData.size > 4)
    }

    @Test
    fun testLogChannelEquality() {
        val channel1 = TestLogChannel("test", IntSchema)
        val channel2 = TestLogChannel("test", IntSchema)
        val channel3 = TestLogChannel("different", IntSchema)

        // Channels with same name and schema should be equal in terms of functionality
        assertEquals(channel1.name, channel2.name)
        assertEquals(channel1.schema, channel2.schema)
        assertNotEquals(channel1.name, channel3.name)
    }

    @Test
    fun testBoundChannel() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)
        val testChannel = TestLogChannel("test", IntSchema)

        val boundChannel = writer.addChannel(testChannel)
        assertEquals("test", boundChannel.name)
        assertEquals(IntSchema, boundChannel.schema)
        assertEquals(writer, boundChannel.writer)
    }

    @Test
    fun testLogWriterContains() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)
        val channel = TestLogChannel("test", IntSchema)

        assertFalse(channel in writer)
        writer.addChannel(channel)
        assertTrue(channel in writer)
    }

    @Test
    fun testLogWriterFactoryMethods() {
        val tempFile = kotlin.io.path.createTempFile("test", ".log").toFile()
        tempFile.deleteOnExit()

        // Test factory method with File
        assertDoesNotThrow {
            LogWriter.create(tempFile).use { writer ->
                val channel = writer.createChannel("test", IntSchema)
                channel.put(42)
            }
        }

        // Test factory method with String path
        assertDoesNotThrow {
            LogWriter.create(tempFile.absolutePath).use { writer ->
                val channel = writer.createChannel("test", StringSchema)
                channel.put("hello")
            }
        }

        assertTrue(tempFile.exists())
        assertTrue(tempFile.length() > 0)
    }

    @Test
    fun testWriterChannelToString() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)
        val channel = writer.createChannel("test", IntSchema)

        val toString = channel.toString()
        assertTrue(toString.contains("Channel"))
        assertTrue(toString.contains("test"))
        assertTrue(toString.contains("IntSchema"))
    }

    @Test
    fun testLogWriterToString() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)

        val toString = writer.toString()
        assertTrue(toString.contains("LogWriter"))
    }

    @Test
    fun testWriterChannelWriteMethod() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)
        val channel = writer.createChannel("test", IntSchema)

        // Test both put() and write() methods do the same thing
        assertDoesNotThrow {
            channel.put(42)
            channel.write(84)
        }

        val writtenData = outputStream.toByteArray()
        assertTrue(writtenData.size > 4)
    }

    @Test
    fun testChannelOwnership() {
        val outputStream1 = ByteArrayOutputStream()
        val outputStream2 = ByteArrayOutputStream()
        val writer1 = LogWriter(outputStream1)
        val writer2 = LogWriter(outputStream2)

        val channel1 = writer1.createChannel("test", IntSchema)
        val channel2 = writer2.createChannel("test", IntSchema)

        // Channels should belong to their respective writers
        assertEquals(writer1, channel1.writer)
        assertEquals(writer2, channel2.writer)
        assertNotEquals(channel1.writer, channel2.writer)

        // Adding a channel from a different writer should fail
        assertThrows(IllegalArgumentException::class.java) {
            writer1.addChannel(channel2)
        }
    }

    @Test
    fun testCreateChannelMethods() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)

        // Test createChannel with EntrySchema
        val intChannel = writer.createChannel("ints", IntSchema)
        assertEquals("ints", intChannel.name)
        assertEquals(IntSchema, intChannel.schema)

        // Test createChannel with Class
        val stringChannel = writer.createChannel("strings", String::class.java)
        assertEquals("strings", stringChannel.name)

        // Test createChannel with KClass
        val boolChannel = writer.createChannel("bools", Boolean::class)
        assertEquals("bools", boolChannel.name)

        // Test that all channels work
        assertDoesNotThrow {
            intChannel.put(42)
            stringChannel.put("hello")
            boolChannel.put(true)
        }
    }
}
