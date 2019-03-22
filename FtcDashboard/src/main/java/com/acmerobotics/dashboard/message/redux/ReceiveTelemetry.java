package com.acmerobotics.dashboard.message.redux;

import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.MessageType;
import com.acmerobotics.dashboard.telemetry.TelemetryPacket;

public class ReceiveTelemetry extends Message {
    private TelemetryPacket telemetry;

    public ReceiveTelemetry(TelemetryPacket packet) {
        super(MessageType.RECEIVE_TELEMETRY);

        telemetry = packet;
    }
}
