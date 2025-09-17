package com.acmerobotics.dashboard.testopmode

import com.acmerobotics.dashboard.RobotStatus.OpModeStatus
import com.acmerobotics.dashboard.SendFun
import com.acmerobotics.dashboard.log.FakeFlightRecorder

abstract class TestOpModeWithLog protected constructor(name: String) : TestOpMode(name) {
    override fun internalInit() {
        FakeFlightRecorder.start(name)
        FakeFlightRecorder.write("OPMODE_PRE_INIT", System.nanoTime())
        super.internalInit()
    }

    override fun internalStart() {
        FakeFlightRecorder.write("OPMODE_PRE_START", System.nanoTime())
        super.internalStart()
    }

    override fun internalStop() {
        stop()
        FakeFlightRecorder.write("OPMODE_POST_STOP", System.nanoTime())
    }
}
