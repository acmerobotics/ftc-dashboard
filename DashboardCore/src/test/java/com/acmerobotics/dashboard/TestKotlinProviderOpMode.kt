package com.acmerobotics.dashboard

import com.acmerobotics.dashboard.config.KotlinValueProvider
import com.acmerobotics.dashboard.telemetry.TelemetryPacket
import com.acmerobotics.dashboard.testopmode.TestOpMode

data class Vector2d(@JvmField var x: Double = 0.0, @JvmField var y: Double = 0.0)

class TestKotlinProviderOpMode : TestOpMode("TestKotlinProviderOpMode") {
    lateinit var doubleProp: KotlinValueProvider<Double>
    lateinit var vectorProp: KotlinValueProvider<Vector2d>

    override fun init() {
        doubleProp = configurable("doubleProp", 0.0)
        vectorProp = configurable("vectorProp", Vector2d())
    }

    override fun loop() {
        val packet = TelemetryPacket().also {
            it.put("doubleProp", doubleProp.get())
            it.put("vectorProp", vectorProp.get())
        }

        TestDashboardInstance.getInstance().sendTelemetryPacket(packet)
    }

    companion object {
        fun <T> configurable(name: String, initial: T) = KotlinValueProvider(initial).also {
            TestDashboardInstance.getInstance().core.addConfigVariable("TestKotlinProvider", name, it)
        }
    }
}