package com.acmerobotics.dashboard;

import java.util.Arrays;
import java.util.List;

public class TestRobotConfigManager {
    private final List<String> testHardwareConfigs =
            Arrays.asList("Config One", "Config Two", "Default");
    private String activeOpMode = "Default";

    public List<String> getTestHardwareConfigs() {
        return testHardwareConfigs;
    }

    public String getActiveHardwareConfig() {
        return activeOpMode;
    }

    public void setHardwareConfig(String hardwareConfigName) {
        if(testHardwareConfigs.contains(hardwareConfigName)) {
            activeOpMode = hardwareConfigName;
        }
    }
}
