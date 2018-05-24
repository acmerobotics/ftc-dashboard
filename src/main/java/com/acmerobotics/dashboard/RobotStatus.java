package com.acmerobotics.dashboard;

public class RobotStatus {
    public enum OpModeStatus {
        INIT,
        RUNNING,
        STOPPED
    }

    private boolean statusAvailable;
    private String activeOpMode;
    private OpModeStatus activeOpModeStatus;

    public RobotStatus() {
        this.statusAvailable = false;
    }

    public RobotStatus(String activeOpMode, OpModeStatus activeOpModeStatus) {
        this.statusAvailable = true;
        this.activeOpMode = activeOpMode;
        this.activeOpModeStatus = activeOpModeStatus;
    }
}
