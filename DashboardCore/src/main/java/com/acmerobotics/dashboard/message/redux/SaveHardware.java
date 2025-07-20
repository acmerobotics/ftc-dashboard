package com.acmerobotics.dashboard.message.redux;

import com.acmerobotics.dashboard.config.variable.CustomVariable;
import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.MessageType;

public class SaveHardware extends Message {
    private CustomVariable hardwareDiff;

    public SaveHardware(CustomVariable hardwareDiff) {
        super(MessageType.SAVE_HARDWARE);

        this.hardwareDiff = hardwareDiff;
    }

    public CustomVariable getHardwareDiff() {
        return hardwareDiff;
    }
}
