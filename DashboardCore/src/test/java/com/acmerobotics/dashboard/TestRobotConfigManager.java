package com.acmerobotics.dashboard;

import java.util.ArrayList;
import java.util.List;

public class TestRobotConfigManager {
    private final List<String> configNames = new ArrayList<>();
    private final List<String> configXmls = new ArrayList<>();
    private final List<Boolean> configReadOnly = new ArrayList<>();

    private String activeOpMode = "Default";

    public TestRobotConfigManager() {
        addConfig("Test Read Only", "<xml>read only</xml>", true);
        addConfig("Default", "<xml>default</xml>", false);
    }

    private void addConfig(String name, String xml, boolean isReadOnly) {
        configNames.add(name);
        configXmls.add(xml);
        configReadOnly.add(isReadOnly);
    }

    public List<String> getTestHardwareConfigs() {
        return new ArrayList<>(configNames);
    }

    public List<String> getActiveConfigXml() {
        return new ArrayList<>(configXmls);
    }

    public List<Boolean> getIsReadOnly() {
        return new ArrayList<>(configReadOnly);
    }

    public String getActiveHardwareConfig() {
        return activeOpMode;
    }

    public void setHardwareConfig(String hardwareConfigName) {
        if (configNames.contains(hardwareConfigName)) {
            activeOpMode = hardwareConfigName;
        }
    }
}
