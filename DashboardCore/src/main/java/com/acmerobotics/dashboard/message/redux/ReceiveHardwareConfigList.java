package com.acmerobotics.dashboard.message.redux;

import com.acmerobotics.dashboard.HardwareConfig;
import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.MessageType;

import java.util.List;

public class ReceiveHardwareConfigList extends Message {
    private List<HardwareConfig> hardwareConfigs;
    private String currentHardwareConfig;

    public ReceiveHardwareConfigList(
            List<HardwareConfig> hardwareConfigs,
            String currentHardwareConfig
    ) {
        super(MessageType.RECEIVE_HARDWARE_CONFIG_LIST);

        this.hardwareConfigs = hardwareConfigs;
        this.currentHardwareConfig = currentHardwareConfig;
    }
}
