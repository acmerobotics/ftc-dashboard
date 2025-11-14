package com.acmerobotics.dashboard.message.redux;

import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.MessageType;

public class WriteHardwareConfig extends Message {
    private String hardwareConfigName;
    private String hardwareConfigContents;

    public WriteHardwareConfig(String hardwareConfigName, String hardwareConfigContents){
        super(MessageType.WRITE_HARDWARE_CONFIG);

        this.hardwareConfigName = hardwareConfigName;
        this.hardwareConfigContents = hardwareConfigContents;
    }

    public String getHardwareConfigName() {
        return hardwareConfigName;
    }
    public String getHardwareConfigContents() {
        return hardwareConfigContents;
    }
}
