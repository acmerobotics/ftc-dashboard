package com.acmerobotics.dashboard.log

import android.annotation.SuppressLint
import android.content.Context
import com.qualcomm.robotcore.eventloop.opmode.OpMode
import com.qualcomm.robotcore.eventloop.opmode.OpModeManagerImpl
import com.qualcomm.robotcore.eventloop.opmode.OpModeManagerNotifier
import com.qualcomm.robotcore.util.RobotLog
import com.qualcomm.robotcore.util.WebHandlerManager
import org.firstinspires.ftc.ftccommon.external.WebHandlerRegistrar
import org.firstinspires.ftc.ftccommon.internal.manualcontrol.ManualControlOpMode
import org.firstinspires.ftc.robotcore.internal.system.AppUtil
import java.io.File
import java.text.SimpleDateFormat

// there may be legacy logs here, but we should be robust to that
val LOG_ROOT = File(AppUtil.ROOT_FOLDER, "RoadRunner/logs");

@SuppressLint("SimpleDateFormat")
private val DATE_FORMAT = SimpleDateFormat("yyyy_MM_dd__HH_mm_ss_SSS");

private fun openLogFile(suffix: String): LogWriter {
    val filename = "${DATE_FORMAT.format(System.currentTimeMillis())}__$suffix.log"
    val file = File(LOG_ROOT, filename)
    LOG_ROOT.mkdirs()
    return LogWriter.create(file)
}

data class FlightLogChannel<T>(
    override val name: String,
    override val schema: EntrySchema<T>,
) : LogChannel<T> {
    override fun put(obj: T) = FlightRecorder.write(this, obj)
    fun write(obj: T) = put(obj)

    fun downsample(maxPeriod: Long): DownsampledWriter<T> {
        return DownsampledWriter(this, maxPeriod)
    }
}

object FlightRecorder : OpModeManagerNotifier.Notifications {
    internal var writer: LogWriter? = null

    // I'm tempted to use @OnCreate, but some of the hooks are unreliable and @WebHandlerRegistrar
    // seems to just work.
    @WebHandlerRegistrar
    @JvmStatic
    fun registerRoutes(context: Context, manager: WebHandlerManager) {
        OpModeManagerImpl.getOpModeManagerOfActivity(AppUtil.getInstance().activity)
                .registerListener(this)
    }

    override fun onOpModePreInit(opMode: OpMode?) {
        synchronized(this) {
            writer?.close()
            writer = null

            // clean up old files
            run {
                val fs = LOG_ROOT.listFiles() ?: return@run
                fs.sortBy { it.lastModified() }
                var totalSizeBytes = fs.sumOf { it.length() }

                var i = 0
                while (i < fs.size && totalSizeBytes >= 250 * 1000 * 1000) {
                    totalSizeBytes -= fs[i].length()
                    if (!fs[i].delete()) {
                        // avoid panicking here
                        RobotLog.setGlobalErrorMsg("Unable to delete file " + fs[i].absolutePath);
                    }
                    ++i
                }
            }

            if (opMode is OpModeManagerImpl.DefaultOpMode || opMode is ManualControlOpMode) {
                return
            }

            writer = openLogFile(opMode?.javaClass?.simpleName ?: "UnknownOpMode")

            write("OPMODE_PRE_INIT", System.nanoTime())
        }
    }

    override fun onOpModePreStart(opMode: OpMode?) {
        write("OPMODE_PRE_START", System.nanoTime())
    }

    override fun onOpModePostStop(opMode: OpMode?) {
        synchronized(this) {
            write("OPMODE_POST_STOP", System.nanoTime())

            writer?.close()
            writer = null
        }
    }

    @JvmStatic
    fun write(channelName: String, obj: Any) {
        synchronized(this) {
            writer?.write(channelName, obj)
        }
    }

    @JvmStatic
    fun <T> write(channel: LogChannel<T>, obj: T) {
        synchronized(this) {
            writer?.write(channel, obj)
        }
    }

    /**
     * Creates a new log channel attached to the current OpMode's writer.
     */
    @JvmStatic
    fun <T> createChannel(name: String, schema: EntrySchema<T>): FlightLogChannel<T> {
        check(writer != null) { "Channels can only be created during an OpMode" }
        return FlightLogChannel(name, schema)
    }

    /**
     * Creates a new log channel attached to the current OpMode's writer.
     */
    @JvmStatic
    fun <T : Any> createChannel(name: String, clazz: Class<T>): FlightLogChannel<T> {
        return createChannel(name, EntrySchema.schemaOfClass(clazz))
    }
}

class DownsampledWriter<T>(val channel: FlightLogChannel<T>, val maxPeriod: Long)
    : LogChannel<T> by channel {
    private var nextWriteTimestamp = 0L

    override fun put(obj: T) {
        val now = System.nanoTime()
        if (now >= nextWriteTimestamp) {
            nextWriteTimestamp = (now / maxPeriod + 1) * maxPeriod
            channel.put(obj)
        }
    }
}
