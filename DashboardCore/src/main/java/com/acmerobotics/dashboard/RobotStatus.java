package com.acmerobotics.dashboard;

/**
 * Container for information about the active op mode and its state.
 */
public class RobotStatus {

    /**
     * Status of an op mode.
     */
    public enum OpModeStatus {
        INIT,
        RUNNING,
        STOPPED
    }

    private boolean enabled;
    private boolean available;
    private String activeOpMode;
    private OpModeStatus activeOpModeStatus;
    private String warningMessage;
    private String errorMessage;

    /**
     * Creates a status object with the default values.
     */
    public RobotStatus(boolean enabled, boolean available, String activeOpMode, OpModeStatus activeOpModeStatus, String warningMessage, String errorMessage) {
        this.enabled = enabled;
        this.available = available;
        this.activeOpMode = activeOpMode;
        this.activeOpModeStatus = activeOpModeStatus;
        this.warningMessage = warningMessage;
        this.errorMessage = errorMessage;
    }
}
