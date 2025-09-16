package com.acmerobotics.dashboard.log

import java.io.File
import java.io.FileOutputStream
import java.nio.ByteBuffer
import java.nio.channels.FileChannel

const val MAGIC = "RR"
const val VERSION: Short = 1

class LogChannel<T>(
    val name: String,
    val schema: EntrySchema<T>,
    val writer: LogWriter
) {
}

class LogWriter(val channel: FileChannel) : AutoCloseable {
    init {
        val headerBuffer = ByteBuffer.allocate(4)
            .put(MAGIC.toByteArray(Charsets.UTF_8))
            .putShort(VERSION)
        headerBuffer.flip()
        channel.write(headerBuffer)
    }

    private val channels = mutableListOf<LogChannel<*>>()

    fun <T> addChannel(channel: LogChannel<T>): LogChannel<T> {
        require(channel.writer == this) { "Channel belongs to a different log writer" }

        // Check for duplicate names
        require(channels.none { it.name == channel.name }) {
            "Channel with name '${channel.name}' already exists"
        }

        channels.add(channel)
        // Write schema entry immediately

        val chBytes = channel.name.toByteArray(Charsets.UTF_8)
        val buffer = ByteBuffer.allocate(8 + chBytes.size + channel.schema.schemaSize)
        buffer.putInt(0) // schema entry
        buffer.putInt(chBytes.size)
        buffer.put(chBytes)
        channel.schema.encodeSchema(buffer)
        require(!buffer.hasRemaining()) {
            "encoded schema does not match reported size: ${buffer.remaining()} bytes remaining"
        }
        buffer.flip()
        this.channel.write(buffer)

        return channel
    }

    /**
     * Writes a message to the log.
     */
    fun <T> write(channel: LogChannel<T>, obj: T) {
        var index = channels.indexOf(channel)

        if (index < 0) {
            addChannel(channel)
            index = channels.lastIndex
        }

        val objSize = channel.schema.objSize(obj)
        val buffer = ByteBuffer.allocate(8 + objSize)
        buffer.putInt(1) // message entry
        buffer.putInt(index) // channel index
        channel.schema.encodeObject(buffer, obj)
        require(!buffer.hasRemaining()) {
            "encoded object does not match reported size: ${buffer.remaining()} bytes remaining"
        }
        buffer.flip()
        this.channel.write(buffer)
    }

    /**
     * Writes a message to the log.
     */
    fun write(channelName: String, obj: Any) {
        // Find existing channel by name
        val existingChannel = channels.find { it.name == channelName }

        if (existingChannel != null) {
            @Suppress("UNCHECKED_CAST")
            write(existingChannel as LogChannel<Any>, obj)
        } else {
            // Create new channel on-demand
            val schema = EntrySchema.schemaOfClass(obj.javaClass)

            @Suppress("UNCHECKED_CAST")
            val newChannel = LogChannel(channelName, schema as EntrySchema<Any>, this)
            addChannel(newChannel)
            write(newChannel, obj)
        }
    }

    override fun close() {
        channel.close()
    }

    companion object {
        /**
         * Creates a LogWriter for the given file path.
         * Android-friendly factory method.
         */
        fun create(file: File): LogWriter {
            val fileOutputStream = FileOutputStream(file)
            return LogWriter(fileOutputStream.channel)
        }

        /**
         * Creates a LogWriter for the given file path string.
         * Convenience method for Android usage.
         */
        fun create(filePath: String): LogWriter {
            return create(File(filePath))
        }
    }
}
