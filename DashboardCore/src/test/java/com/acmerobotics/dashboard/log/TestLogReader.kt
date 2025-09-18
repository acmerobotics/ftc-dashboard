package com.acmerobotics.dashboard.log

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.io.TempDir
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.nio.file.Path

class TestLogReader {

    // Test data classes
    data class TestStruct(
        @JvmField val id: Int,
        @JvmField val name: String,
        @JvmField val active: Boolean
    )

    enum class TestStatus { IDLE, RUNNING, STOPPED }

    @Test
    fun testLogReaderBasicReadWrite() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)

        // Create channels and write data
        val intChannel = writer.createChannel("numbers", Int::class.java)
        val stringChannel = writer.createChannel("messages", String::class.java)

        intChannel.put(42)
        stringChannel.put("Hello")
        intChannel.put(84)
        stringChannel.put("World")

        writer.close()

        // Read back the data
        val inputStream = ByteArrayInputStream(outputStream.toByteArray())
        val reader = LogReader(inputStream)

        val entries = reader.readAll()
        reader.close()

        // Should have 2 schema entries + 4 message entries
        assertEquals(6, entries.size)

        // Check schema entries
        assertTrue(entries[0] is LogEntry.Schema)
        assertTrue(entries[1] is LogEntry.Schema)

        val schema1 = entries[0] as LogEntry.Schema
        val schema2 = entries[1] as LogEntry.Schema

        assertEquals("numbers", schema1.channelName)
        assertEquals("messages", schema2.channelName)
        assertTrue(schema1.schema is IntSchema)
        assertTrue(schema2.schema is StringSchema)

        // Check message entries
        val message1 = entries[2] as LogEntry.Message<*>
        val message2 = entries[3] as LogEntry.Message<*>
        val message3 = entries[4] as LogEntry.Message<*>
        val message4 = entries[5] as LogEntry.Message<*>

        assertEquals(0, message1.channelIndex)
        assertEquals("numbers", message1.channelName)
        assertEquals(42, message1.data)

        assertEquals(1, message2.channelIndex)
        assertEquals("messages", message2.channelName)
        assertEquals("Hello", message2.data)

        assertEquals(0, message3.channelIndex)
        assertEquals("numbers", message3.channelName)
        assertEquals(84, message3.data)

        assertEquals(1, message4.channelIndex)
        assertEquals("messages", message4.channelName)
        assertEquals("World", message4.data)
    }

    @Test
    fun testLogReaderWithAllPrimitiveTypes() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)

        // Create channels for all primitive types
        val intChannel = writer.createChannel("ints", Int::class.java)
        val longChannel = writer.createChannel("longs", Long::class.java)
        val doubleChannel = writer.createChannel("doubles", Double::class.java)
        val stringChannel = writer.createChannel("strings", String::class.java)
        val boolChannel = writer.createChannel("bools", Boolean::class.java)

        // Write test data
        intChannel.put(123)
        longChannel.put(456789L)
        doubleChannel.put(3.14159)
        stringChannel.put("Test String")
        boolChannel.put(true)
        boolChannel.put(false)

        writer.close()

        // Read back the data
        val inputStream = ByteArrayInputStream(outputStream.toByteArray())
        val reader = LogReader(inputStream)

        val allEntries = reader.readAll()
        val messageEntries = allEntries.filterIsInstance<LogEntry.Message<*>>()

        assertEquals(6, messageEntries.size)

        // Verify data
        assertEquals(123, messageEntries[0].data)
        assertEquals(456789L, messageEntries[1].data)
        assertEquals(3.14159, messageEntries[2].data as Double, 1e-10)
        assertEquals("Test String", messageEntries[3].data)
        assertEquals(true, messageEntries[4].data)
        assertEquals(false, messageEntries[5].data)

        reader.close()
    }

    @Test
    fun testLogReaderWithEnums() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)

        val enumChannel = writer.createChannel("status", TestStatus::class.java)

        enumChannel.put(TestStatus.IDLE)
        enumChannel.put(TestStatus.RUNNING)
        enumChannel.put(TestStatus.STOPPED)

        writer.close()

        // Read back the data
        val inputStream = ByteArrayInputStream(outputStream.toByteArray())
        val reader = LogReader(inputStream)

        val messageEntries = reader.readAll().filterIsInstance<LogEntry.Message<*>>()
        reader.close()

        assertEquals(3, messageEntries.size)

        // Enum values are now returned as string constant names
        assertEquals("IDLE", messageEntries[0].data)
        assertEquals("RUNNING", messageEntries[1].data)
        assertEquals("STOPPED", messageEntries[2].data)
    }

    @Test
    fun testLogReaderWithArrays() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)

        val arrayChannel = writer.createChannel("arrays", Array<Int>::class.java)

        arrayChannel.put(arrayOf(1, 2, 3))
        arrayChannel.put(arrayOf(4, 5, 6, 7))

        writer.close()

        // Read back the data
        val inputStream = ByteArrayInputStream(outputStream.toByteArray())
        val reader = LogReader(inputStream)

        val messageEntries = reader.readAll().filterIsInstance<LogEntry.Message<*>>()
        reader.close()

        assertEquals(2, messageEntries.size)

        val array1 = messageEntries[0].data as Array<*>
        val array2 = messageEntries[1].data as Array<*>

        assertArrayEquals(arrayOf(1, 2, 3), array1)
        assertArrayEquals(arrayOf(4, 5, 6, 7), array2)
    }

    @Test
    fun testLogReaderWithStructs() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)

        val structChannel = writer.createChannel("structs", TestStruct::class.java)

        structChannel.put(TestStruct(1, "First", true))
        structChannel.put(TestStruct(2, "Second", false))

        writer.close()

        // Read back the data
        val inputStream = ByteArrayInputStream(outputStream.toByteArray())
        val reader = LogReader(inputStream)

        val messageEntries = reader.readAll().filterIsInstance<LogEntry.Message<*>>()
        reader.close()

        assertEquals(2, messageEntries.size)

        // Struct values are returned as maps
        val struct1 = messageEntries[0].data as Map<*, *>
        val struct2 = messageEntries[1].data as Map<*, *>

        assertEquals(1, struct1["id"])
        assertEquals("First", struct1["name"])
        assertEquals(true, struct1["active"])

        assertEquals(2, struct2["id"])
        assertEquals("Second", struct2["name"])
        assertEquals(false, struct2["active"])
    }

    @Test
    fun testLogReaderChannelInfo() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)

        val intChannel = writer.createChannel("numbers", Int::class.java)
        val stringChannel = writer.createChannel("messages", String::class.java)

        intChannel.put(42)
        stringChannel.put("test")

        writer.close()

        // Read back and check channel info
        val inputStream = ByteArrayInputStream(outputStream.toByteArray())
        val reader = LogReader(inputStream)

        // Process all entries to populate channel info
        reader.readAll()

        val channels = reader.getChannels()
        assertEquals(2, channels.size)

        assertEquals("numbers", channels[0].name)
        assertTrue(channels[0].schema is IntSchema)

        assertEquals("messages", channels[1].name)
        assertTrue(channels[1].schema is StringSchema)

        // Test getChannel by index
        val channel0 = reader.getChannel(0)
        assertNotNull(channel0)
        assertEquals("numbers", channel0!!.name)

        val channel1 = reader.getChannel(1)
        assertNotNull(channel1)
        assertEquals("messages", channel1!!.name)

        val channelInvalid = reader.getChannel(5)
        assertNull(channelInvalid)

        reader.close()
    }

    @Test
    fun testLogReaderReadMessagesForChannel() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)

        val intChannel = writer.createChannel("numbers", Int::class.java)
        val stringChannel = writer.createChannel("messages", String::class.java)

        intChannel.put(1)
        stringChannel.put("first")
        intChannel.put(2)
        stringChannel.put("second")
        intChannel.put(3)

        writer.close()

        // Read back using channel filter
        val inputStream = ByteArrayInputStream(outputStream.toByteArray())
        val reader = LogReader(inputStream)

        val numberMessages = reader.readMessagesForChannel("numbers")
        assertEquals(3, numberMessages.size)
        assertEquals(1, numberMessages[0].data)
        assertEquals(2, numberMessages[1].data)
        assertEquals(3, numberMessages[2].data)

        reader.close()

        // Read again for string messages
        val inputStream2 = ByteArrayInputStream(outputStream.toByteArray())
        val reader2 = LogReader(inputStream2)

        val stringMessages = reader2.readMessagesForChannel("messages")
        assertEquals(2, stringMessages.size)
        assertEquals("first", stringMessages[0].data)
        assertEquals("second", stringMessages[1].data)

        reader2.close()
    }

    @Test
    fun testLogReaderIterator() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)

        val intChannel = writer.createChannel("numbers", Int::class.java)
        intChannel.put(1)
        intChannel.put(2)
        intChannel.put(3)

        writer.close()

        // Test iterator interface
        val inputStream = ByteArrayInputStream(outputStream.toByteArray())
        val reader = LogReader(inputStream)

        val entries = mutableListOf<LogEntry>()
        while (reader.hasNext()) {
            entries.add(reader.next())
        }

        assertEquals(4, entries.size) // 1 schema + 3 messages

        // Test that calling next() after end throws exception
        assertThrows(NoSuchElementException::class.java) {
            reader.next()
        }

        reader.close()
    }

    @Test
    fun testLogReaderFileOperations(@TempDir tempDir: Path) {
        val logFile = tempDir.resolve("test.log").toFile()

        // Write to file
        val writer = LogWriter.create(logFile)
        val channel = writer.createChannel("data", String::class.java)
        channel.put("Hello File!")
        writer.close()

        // Read from file using factory methods
        val reader1 = LogReader.create(logFile)
        val entries1 = reader1.readAll()
        reader1.close()

        val reader2 = LogReader.create(logFile.absolutePath)
        val entries2 = reader2.readAll()
        reader2.close()

        assertEquals(2, entries1.size) // schema + message
        assertEquals(2, entries2.size)

        val message1 = entries1[1] as LogEntry.Message<*>
        val message2 = entries2[1] as LogEntry.Message<*>

        assertEquals("Hello File!", message1.data)
        assertEquals("Hello File!", message2.data)
    }

    @Test
    fun testLogReaderInvalidFile() {
        // Test with invalid magic bytes
        val invalidData = byteArrayOf(0x00, 0x00, 0x00, 0x01) // Wrong magic
        val inputStream = ByteArrayInputStream(invalidData)

        assertThrows(IllegalArgumentException::class.java) {
            LogReader(inputStream)
        }
    }

    @Test
    fun testLogReaderUnsupportedVersion() {
        // Test with wrong version
        val wrongVersionData = byteArrayOf('R'.code.toByte(), 'R'.code.toByte(), 0x00, 0x99.toByte()) // Version 99
        val inputStream = ByteArrayInputStream(wrongVersionData)

        assertThrows(IllegalArgumentException::class.java) {
            LogReader(inputStream)
        }
    }

    @Test
    fun testLogReaderEmptyFile() {
        // Test with file that has only header
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)
        writer.close() // Close without writing any channels

        val inputStream = ByteArrayInputStream(outputStream.toByteArray())
        val reader = LogReader(inputStream)

        assertFalse(reader.hasNext())
        assertEquals(0, reader.readAll().size)
        assertEquals(0, reader.getChannels().size)

        reader.close()
    }

    @Test
    fun testLogReaderUtf8Strings() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)

        val stringChannel = writer.createChannel("unicode", String::class.java)
        stringChannel.put("Hello 🌍 UTF-8 测试!")

        writer.close()

        val inputStream = ByteArrayInputStream(outputStream.toByteArray())
        val reader = LogReader(inputStream)

        val messageEntries = reader.readAll().filterIsInstance<LogEntry.Message<*>>()
        assertEquals("Hello 🌍 UTF-8 测试!", messageEntries[0].data)

        reader.close()
    }

    @Test
    fun testLogReaderEnumSchemaInfo() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)

        val enumChannel = writer.createChannel("status", TestStatus::class.java)
        enumChannel.put(TestStatus.RUNNING)

        writer.close()

        // Read back and check enum schema info
        val inputStream = ByteArrayInputStream(outputStream.toByteArray())
        val reader = LogReader(inputStream)

        reader.readAll()
        val channels = reader.getChannels()
        assertEquals(1, channels.size)

        val enumSchema = channels[0].schema as DynamicEnumSchema
        assertEquals(listOf("IDLE", "RUNNING", "STOPPED"), enumSchema.constantNames)

        reader.close()
    }

    enum class SingleValue { ONLY }

    @Test
    fun testLogReaderEnumEdgeCases() {
        val outputStream = ByteArrayOutputStream()
        val writer = LogWriter(outputStream)

        val enumChannel = writer.createChannel("single", SingleValue::class.java)
        enumChannel.put(SingleValue.ONLY)

        writer.close()

        val inputStream = ByteArrayInputStream(outputStream.toByteArray())
        val reader = LogReader(inputStream)

        val messageEntries = reader.readAll().filterIsInstance<LogEntry.Message<*>>()
        assertEquals(1, messageEntries.size)
        assertEquals("ONLY", messageEntries[0].data)

        reader.close()
    }
}
