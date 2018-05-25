package com.acmerobotics.dashboard;

public class RobotStatus {
    public enum OpModeStatus {
        INIT,
        RUNNING,
        STOPPED
    }

    private boolean available;
    private String activeOpMode;
    private OpModeStatus activeOpModeStatus;

    public RobotStatus() {
        this.available = false;
        this.activeOpMode = "None";
        this.activeOpModeStatus = OpModeStatus.STOPPED;
    }

    public RobotStatus(String activeOpMode, OpModeStatus activeOpModeStatus) {
        this.available = true;
        this.activeOpMode = activeOpMode;
        this.activeOpModeStatus = activeOpModeStatus;
    }
}
