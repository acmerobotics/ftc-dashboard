package com.acmerobotics.dashboard.message.redux;

import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.MessageType;

import java.util.List;

public class ReceiveHardwareConfigList extends Message {
    private List<String> hardwareConfigList;
    private String currentHardwareConfig;

    public ReceiveHardwareConfigList(List<String> hardwareConfigList, String currentHardwareConfig){
        super(MessageType.RECEIVE_HARDWARE_CONFIG_LIST);

        this.hardwareConfigList = hardwareConfigList;
        this.currentHardwareConfig = currentHardwareConfig;
    }
}
