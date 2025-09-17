package com.acmerobotics.dashboard.log

/**
 * A lightweight, test-only replacement for the Android-dependent FlightRecorder.
 *
 * Placed in the DashboardCore test module so unit tests can create channels and
 * write using a LogWriter without requiring Android/FTC SDK classes.
 */
object FakeFlightRecorder {
    internal var writer: LogWriter? = null

    @JvmStatic
    fun setWriter(w: LogWriter?) {
        writer = w
    }

    @JvmStatic
    fun write(channelName: String, obj: Any) {
        writer?.write(channelName, obj)
    }

    @JvmStatic
    fun <T> write(channel: LogChannel<T>, obj: T) {
        writer?.write(channel, obj)
    }

    /**
     * Creates a new log channel (no lifecycle checks in tests).
     */
    @JvmStatic
    fun <T> createChannel(name: String, schema: EntrySchema<T>): FlightLogChannel<T> {
        return FlightLogChannel(name, schema)
    }

    /**
     * Convenience overload using reflection-based schema.
     */
    @JvmStatic
    fun <T : Any> createChannel(name: String, clazz: Class<T>): FlightLogChannel<T> {
        return createChannel(name, EntrySchema.schemaOfClass(clazz))
    }
}

/**
 * Simple channel implementation for tests that forwards writes to FlightRecorder.
 */
data class FlightLogChannel<T>(
    override val name: String,
    override val schema: EntrySchema<T>,
) : LogChannel<T> {
    override fun put(obj: T) = FakeFlightRecorder.write(this, obj)
    fun write(obj: T) = put(obj)
}
