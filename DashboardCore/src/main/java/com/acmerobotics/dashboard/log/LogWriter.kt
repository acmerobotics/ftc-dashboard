package com.acmerobotics.dashboard.log

import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream
import java.nio.ByteBuffer
import kotlin.reflect.KClass

const val MAGIC = "RR"
const val VERSION: Short = 1

/**
 * A log channel.
 */
interface LogChannel<T> {
    val name: String
    val schema: EntrySchema<T>

    fun put(obj: T)
}

class LogWriter(val stream: OutputStream) : AutoCloseable {
    init {
        val headerBuffer = ByteBuffer.allocate(4)
            .put(MAGIC.toByteArray(Charsets.UTF_8))
            .putShort(VERSION)
        headerBuffer.flip()
        stream.write(headerBuffer)
    }

    private val channels = mutableListOf<WriterChannel<*>>()

    /**
     * Adds a channel to the log.
     */
    fun <T> addChannel(channel: WriterChannel<T>): WriterChannel<T> {
        // Check for duplicate names
        require(channels.none { it.name == channel.name }) {
            "Channel with name '${channel.name}' already exists"
        }

        // this uses referential equality (as equals isn't overridden) because we want to make sure
        //that we are only adding channels that belong to this log writer
        require(channel.writer == this) {
            "Channel belongs to a different log writer"
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
        this.stream.write(buffer)

        return channel
    }

    /**
     * Adds a channel to the log, creating a [WriterChannel] from the given [LogChannel] if necessary.
     */
    fun <T> addChannel(channel: LogChannel<T>) = boundChannel(channel)

    /**
     * Creates a new log channel and adds it to the log.
     */
    fun <T> createChannel(name: String, schema: EntrySchema<T>) =
        addChannel(WriterChannel(name, schema))

    /**
     * Creates a new log channel and adds it to the log.
     */
    fun <T : Any> createChannel(name: String, cls: Class<T>) =
        createChannel(name, EntrySchema.schemaOfClass(cls))

    /**
     * Creates a new log channel and adds it to the log.
     */
    fun <T : Any> createChannel(name: String, cls: KClass<T>) =
        createChannel(name, EntrySchema.schemaOfClass(cls.java))

    /**
     * Writes a message to the log.
     */
    fun <T> write(channel: LogChannel<T>, obj: T) {
        var index = channels.indexOf(boundChannel(channel))

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
        this.stream.write(buffer)
    }

    /**
     * Writes a message to the log.
     */
    fun write(channelName: String, obj: Any) {
        // Find existing channel by name
        val existingChannel = channels.find { it.name == channelName }

        if (existingChannel != null) {
            @Suppress("UNCHECKED_CAST")
            write(existingChannel as WriterChannel<Any>, obj)
        } else {
            // Create new channel on-demand
            val schema = EntrySchema.schemaOfClass(obj.javaClass)

            @Suppress("UNCHECKED_CAST")
            val newChannel = WriterChannel(channelName, schema)
            addChannel(newChannel)
            write(newChannel, obj)
        }
    }

    override fun close() {
        stream.flush()
        stream.close()
    }

    /**
     * A log channel backed by a [LogWriter].
     */
    inner class WriterChannel<T> internal constructor(
        override val name: String,
        override val schema: EntrySchema<T>
    ) : LogChannel<T> {
        val writer: LogWriter get() = this@LogWriter

        override fun put(obj: T) = write(this, obj)

        fun write(obj: T) = put(obj)

        override fun toString() = "Channel($name, $schema, $writer)"
    }

    /**
     * Returns the [WriterChannel] associated with [channel] or a newly created one if it doesn't exist.
     */
    private fun <T> boundChannel(channel: LogChannel<T>): WriterChannel<T> {
        val found = channels.find { it.name == channel.name }

        if (found != null) {
            @Suppress("UNCHECKED_CAST")
            return found as WriterChannel<T>
        }

        return addChannel(WriterChannel(channel.name, channel.schema))
    }

    override fun toString() = "LogWriter($stream)"

    operator fun contains(channel: LogChannel<*>) = channels.any { it.name == channel.name }

    companion object {
        /**
         * Creates a LogWriter for the given file path.
         * Android-friendly factory method.
         */
        fun create(file: File): LogWriter {
            return LogWriter(FileOutputStream(file))
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

internal fun OutputStream.write(buffer: ByteBuffer) {
    if (!buffer.hasArray()) {
        error { "LogWriter only supports direct byte buffer access" }
    }

    write(buffer.array())
}