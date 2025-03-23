package com.acmerobotics.dashboard.message.redux;

import com.acmerobotics.dashboard.config.variable.CustomVariable;
import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.MessageType;

public class ReceiveHardware extends Message {
    private CustomVariable hardwareRoot;

    public ReceiveHardware(CustomVariable hardwareRoot) {
        super(MessageType.RECEIVE_HARDWARE);

        this.hardwareRoot = hardwareRoot;
    }
}
