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
    }

    public RobotStatus(String activeOpMode, OpModeStatus activeOpModeStatus) {
        this.available = true;
        this.activeOpMode = activeOpMode;
        this.activeOpModeStatus = activeOpModeStatus;
    }
}
