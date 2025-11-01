package com.acmerobotics.dashboard.message.redux;

import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.MessageType;

import java.util.List;

public class ReceiveHardwareConfigList extends Message {
    private List<String> hardwareConfigList;
    private List<String> hardwareConfigFiles;
    private String currentHardwareConfig;
    private List<Boolean> isReadOnlyList;

    public ReceiveHardwareConfigList(List<String> hardwareConfigList, List<String> hardwareConfigFiles, List<Boolean> isReadOnlyList, String currentHardwareConfig){
        super(MessageType.RECEIVE_HARDWARE_CONFIG_LIST);

        this.hardwareConfigList = hardwareConfigList;
        this.hardwareConfigFiles = hardwareConfigFiles;
        this.isReadOnlyList = isReadOnlyList;
        this.currentHardwareConfig = currentHardwareConfig;
    }
}
