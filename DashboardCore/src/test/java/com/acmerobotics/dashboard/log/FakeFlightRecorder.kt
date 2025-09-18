package com.acmerobotics.dashboard.log

import com.acmerobotics.dashboard.TestDashboardInstance
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat

/**
 * A lightweight, test-only replacement for the Android-dependent FlightRecorder.
 *
 * Placed in the DashboardCore test module so unit tests can create channels and
 * write using a LogWriter without requiring Android/FTC SDK classes.
 */

private val DATE_FORMAT = SimpleDateFormat("yyyy_MM_dd__HH_mm_ss_SSS")

private fun openLogFile(suffix: String): LogWriter {
    val filename = "${DATE_FORMAT.format(System.currentTimeMillis())}__$suffix.log"
    val file = File(TestDashboardInstance.LOG_ROOT, filename)
    TestDashboardInstance.LOG_ROOT.mkdirs()
    return LogWriter.create(file)
}

object FakeFlightRecorder {
    internal var writer: LogWriter? = null

    @JvmStatic
    fun start(fileName: String) {
        setWriter(openLogFile(fileName))
    }

    @JvmStatic
    fun stop() {
        writer!!.close()
        writer = null
    }

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
