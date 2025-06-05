package com.acmerobotics.dashboard.message.redux;

import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.MessageType;

public class SetHardwareConfig extends Message {
    private String hardwareConfigName;

    public SetHardwareConfig(String hardwareConfigName){
        super(MessageType.SET_HARDWARE_CONFIG);

        this.hardwareConfigName = hardwareConfigName;
    }

    public String getHardwareConfigName() {
        return hardwareConfigName;
    }
}
