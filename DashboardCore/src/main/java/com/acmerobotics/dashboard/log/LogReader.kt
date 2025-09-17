package com.acmerobotics.dashboard.log

import java.io.File
import java.io.FileInputStream
import java.io.InputStream
import java.nio.ByteBuffer

/**
 * Represents a log entry read from a log file.
 */
sealed class LogEntry {
    /**
     * Schema definition entry for a channel.
     */
    data class Schema(
        val channelName: String,
        val schema: EntrySchema<*>
    ) : LogEntry()

    /**
     * Message entry containing data for a channel.
     */
    data class Message<T>(
        val channelIndex: Int,
        val channelName: String,
        val data: T
    ) : LogEntry()
}

/**
 * A schema for enums that preserves the constant names for decoding.
 */
class DynamicEnumSchema(val constantNames: List<String>) : EntrySchema<String> {
    override val tag: Int = 6
    override val schemaSize: Int = Int.SIZE_BYTES + Int.SIZE_BYTES + constantNames.sumOf {
        Int.SIZE_BYTES + it.toByteArray(Charsets.UTF_8).size
    }

    override fun encodeSchema(buffer: ByteBuffer) {
        buffer.putInt(tag)
        buffer.putInt(constantNames.size)
        for (constantName in constantNames) {
            val bytes = constantName.toByteArray(Charsets.UTF_8)
            buffer.putInt(bytes.size)
            buffer.put(bytes)
        }
    }

    override fun objSize(obj: String): Int = Int.SIZE_BYTES

    override fun encodeObject(buffer: ByteBuffer, obj: String) {
        val ordinal = constantNames.indexOf(obj)
        if (ordinal == -1) {
            throw IllegalArgumentException("Unknown enum constant: $obj")
        }
        buffer.putInt(ordinal)
    }

    fun getConstantName(ordinal: Int): String {
        if (ordinal < 0 || ordinal >= constantNames.size) {
            throw IllegalArgumentException("Invalid enum ordinal: $ordinal. Valid range: 0-${constantNames.size - 1}")
        }
        return constantNames[ordinal]
    }
}

/**
 * Reads log files created by [LogWriter].
 */
class LogReader(private val stream: InputStream) : AutoCloseable, Iterator<LogEntry> {

    private val channels = mutableListOf<ChannelInfo>()
    private var headerRead = false
    private var nextEntry: LogEntry? = null
    private var hasNextCached = false

    data class ChannelInfo(
        val name: String,
        val schema: EntrySchema<*>
    )

    init {
        readHeader()
    }

    private fun readHeader() {
        val headerBytes = ByteArray(4)
        val bytesRead = stream.read(headerBytes)
        if (bytesRead != 4) {
            throw IllegalArgumentException("Invalid log file: could not read header")
        }

        val magic = String(headerBytes, 0, 2, Charsets.UTF_8)
        if (magic != MAGIC) {
            throw IllegalArgumentException("Invalid log file: wrong magic bytes. Expected '$MAGIC', got '$magic'")
        }

        val version = ByteBuffer.wrap(headerBytes, 2, 2).short
        if (version != VERSION) {
            throw IllegalArgumentException("Unsupported log version: $version. Expected: $VERSION")
        }

        headerRead = true
    }

    override fun hasNext(): Boolean {
        if (hasNextCached) {
            return nextEntry != null
        }

        nextEntry = readNextEntry()
        hasNextCached = true
        return nextEntry != null
    }

    override fun next(): LogEntry {
        if (!hasNext()) {
            throw NoSuchElementException("No more log entries")
        }

        val entry = nextEntry!!
        nextEntry = null
        hasNextCached = false
        return entry
    }

    private fun readNextEntry(): LogEntry? {
        try {
            // Read entry type (4 bytes)
            val entryTypeBytes = ByteArray(4)
            val bytesRead = stream.read(entryTypeBytes)
            if (bytesRead != 4) {
                return null // End of file
            }

            val entryType = ByteBuffer.wrap(entryTypeBytes).int

            return when (entryType) {
                0 -> readSchemaEntry()
                1 -> readMessageEntry()
                else -> throw IllegalArgumentException("Unknown entry type: $entryType")
            }
        } catch (e: Exception) {
            return null // End of file or error
        }
    }

    private fun readSchemaEntry(): LogEntry.Schema {
        // Read channel name length
        val nameLengthBytes = ByteArray(4)
        stream.read(nameLengthBytes)
        val nameLength = ByteBuffer.wrap(nameLengthBytes).int

        // Read channel name
        val nameBytes = ByteArray(nameLength)
        stream.read(nameBytes)
        val channelName = String(nameBytes, Charsets.UTF_8)

        // Read schema
        val schema = readSchema()

        // Add to channels list
        val channelInfo = ChannelInfo(channelName, schema)
        channels.add(channelInfo)

        return LogEntry.Schema(channelName, schema)
    }

    private fun readSchema(): EntrySchema<*> {
        // Read schema tag
        val tagBytes = ByteArray(4)
        stream.read(tagBytes)
        return when (val tag = ByteBuffer.wrap(tagBytes).int) {
            0 -> readStructSchema() // ReflectedClassSchema uses tag 0
            1 -> IntSchema
            2 -> LongSchema
            3 -> DoubleSchema
            4 -> StringSchema
            5 -> BooleanSchema
            6 -> readEnumSchema()
            7 -> readArraySchema()
            else -> throw IllegalArgumentException("Unknown schema tag: $tag")
        }
    }

    private fun readEnumSchema(): DynamicEnumSchema {
        // Read number of enum constants
        val countBytes = ByteArray(4)
        stream.read(countBytes)
        val count = ByteBuffer.wrap(countBytes).int

        val constantNames = mutableListOf<String>()
        repeat(count) {
            // Read constant name length
            val nameLengthBytes = ByteArray(4)
            stream.read(nameLengthBytes)
            val nameLength = ByteBuffer.wrap(nameLengthBytes).int

            // Read constant name
            val nameBytes = ByteArray(nameLength)
            stream.read(nameBytes)
            val constantName = String(nameBytes, Charsets.UTF_8)
            constantNames.add(constantName)
        }

        // Create a dynamic enum schema that can map ordinals to names
        return DynamicEnumSchema(constantNames)
    }

    private fun readArraySchema(): ArraySchema<*> {
        val elementSchema = readSchema()
        return ArraySchema(elementSchema)
    }

    private fun readStructSchema(): ReflectedClassSchema<*> {
        // Read number of fields
        val fieldCountBytes = ByteArray(4)
        stream.read(fieldCountBytes)
        val fieldCount = ByteBuffer.wrap(fieldCountBytes).int

        val fields = mutableMapOf<String, EntrySchema<*>>()
        repeat(fieldCount) {
            // Read field name length
            val nameLengthBytes = ByteArray(4)
            stream.read(nameLengthBytes)
            val nameLength = ByteBuffer.wrap(nameLengthBytes).int

            // Read field name
            val nameBytes = ByteArray(nameLength)
            stream.read(nameBytes)
            val fieldName = String(nameBytes, Charsets.UTF_8)

            // Read field schema
            val fieldSchema = readSchema()
            fields[fieldName] = fieldSchema
        }

        return ReflectedClassSchema<Any>(fields)
    }

    private fun readMessageEntry(): LogEntry.Message<*> {
        // Read channel index
        val indexBytes = ByteArray(4)
        stream.read(indexBytes)
        val channelIndex = ByteBuffer.wrap(indexBytes).int

        if (channelIndex >= channels.size) {
            throw IllegalArgumentException("Invalid channel index: $channelIndex. Only ${channels.size} channels registered.")
        }

        val channelInfo = channels[channelIndex]
        val data = readObject(channelInfo.schema)

        return LogEntry.Message(channelIndex, channelInfo.name, data)
    }

    private fun readObject(schema: EntrySchema<*>): Any {
        return when (schema) {
            is IntSchema -> {
                val bytes = ByteArray(4)
                stream.read(bytes)
                ByteBuffer.wrap(bytes).int
            }
            is LongSchema -> {
                val bytes = ByteArray(8)
                stream.read(bytes)
                ByteBuffer.wrap(bytes).long
            }
            is DoubleSchema -> {
                val bytes = ByteArray(8)
                stream.read(bytes)
                ByteBuffer.wrap(bytes).double
            }
            is StringSchema -> {
                // Read string length
                val lengthBytes = ByteArray(4)
                stream.read(lengthBytes)
                val length = ByteBuffer.wrap(lengthBytes).int

                // Read string bytes
                val stringBytes = ByteArray(length)
                stream.read(stringBytes)
                String(stringBytes, Charsets.UTF_8)
            }
            is BooleanSchema -> {
                val bytes = ByteArray(1)
                stream.read(bytes)
                bytes[0] != 0.toByte()
            }
            is DynamicEnumSchema -> {
                val bytes = ByteArray(4)
                stream.read(bytes)
                val ordinal = ByteBuffer.wrap(bytes).int
                // Return the actual enum constant name instead of ordinal
                schema.getConstantName(ordinal)
            }
            is EnumSchema -> {
                val bytes = ByteArray(4)
                stream.read(bytes)
                val ordinal = ByteBuffer.wrap(bytes).int
                // Return ordinal value for legacy EnumSchema
                ordinal
            }
            is ArraySchema<*> -> {
                // Read array length
                val lengthBytes = ByteArray(4)
                stream.read(lengthBytes)
                val length = ByteBuffer.wrap(lengthBytes).int

                // Read array elements
                val elements = mutableListOf<Any>()
                repeat(length) {
                    elements.add(readObject(schema.elementSchema))
                }
                elements.toTypedArray()
            }
            is ReflectedClassSchema<*> -> {
                val fieldValues = mutableMapOf<String, Any>()
                for ((fieldName, fieldSchema) in schema.fields) {
                    val fieldValue = readObject(fieldSchema)
                    fieldValues[fieldName] = fieldValue
                }
                // Return a map of field values since we can't reconstruct the actual class
                fieldValues
            }
        }
    }

    /**
     * Returns all channels that have been registered in the log.
     */
    fun getChannels(): List<ChannelInfo> = channels.toList()

    /**
     * Returns the channel info for the given index.
     */
    fun getChannel(index: Int): ChannelInfo? = channels.getOrNull(index)

    /**
     * Returns all entries in the log as a list.
     */
    fun readAll(): List<LogEntry> {
        val entries = mutableListOf<LogEntry>()
        while (hasNext()) {
            entries.add(next())
        }
        return entries
    }

    /**
     * Returns all message entries for the given channel name.
     */
    fun readMessagesForChannel(channelName: String): List<LogEntry.Message<*>> {
        return readAll().filterIsInstance<LogEntry.Message<*>>()
            .filter { it.channelName == channelName }
    }

    override fun close() {
        stream.close()
    }

    companion object {
        /**
         * Creates a LogReader for the given file.
         */
        fun create(file: File): LogReader {
            return LogReader(FileInputStream(file))
        }

        /**
         * Creates a LogReader for the given file path.
         */
        fun create(filePath: String): LogReader {
            return create(File(filePath))
        }
    }
}