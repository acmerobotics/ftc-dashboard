package com.acmerobotics.dashboard.message.redux;

import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.MessageType;

public class ClearTelemetry extends Message {
    public ClearTelemetry() {
        super(MessageType.CLEAR_TELEMETRY);
    }
}
