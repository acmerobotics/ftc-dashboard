package com.acmerobotics.dashboard;

import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;

public class TestRobotConfigManager {
    private final Map<String, String> testHardwareConfigs = new HashMap<>();
    private String activeOpMode = "Default";

    public TestRobotConfigManager() {
        testHardwareConfigs.put("Config One", "<xml>config one data</xml>");
        testHardwareConfigs.put("Config Two", "<xml>config two data</xml>");
        testHardwareConfigs.put("Default", "<xml>default data</xml>");
    }

    public Map<String, String> getTestHardwareConfigsMap() {
        return testHardwareConfigs;
    }

    // Keep the old method signature for now, but return keys from the map
    public List<String> getTestHardwareConfigs() {
        return new ArrayList<>(testHardwareConfigs.keySet());
    }

    public String getActiveHardwareConfig() {
        return activeOpMode;
    }

    public List<String> getActiveConfigXml() {
        return new ArrayList<>(testHardwareConfigs.values());
    }

    public void setHardwareConfig(String hardwareConfigName) {
        if(testHardwareConfigs.containsKey(hardwareConfigName)) {
            activeOpMode = hardwareConfigName;
        }
    }
}
