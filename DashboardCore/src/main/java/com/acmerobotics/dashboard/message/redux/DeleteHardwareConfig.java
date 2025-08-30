package com.acmerobotics.dashboard.message.redux;

import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.MessageType;

public class DeleteHardwareConfig extends Message {
    private String hardwareConfigName;
    public DeleteHardwareConfig(String hardwareConfigName){
        super(MessageType.WRITE_HARDWARE_CONFIG);

        this.hardwareConfigName = hardwareConfigName;
    }

    public String getHardwareConfigName() {
        return hardwareConfigName;
    }
}
