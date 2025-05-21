package com.acmerobotics.dashboard.message.redux;

import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.MessageType;

public class GetHardware extends Message {
    public GetHardware() {
        super(MessageType.GET_HARDWARE);
    }
}
