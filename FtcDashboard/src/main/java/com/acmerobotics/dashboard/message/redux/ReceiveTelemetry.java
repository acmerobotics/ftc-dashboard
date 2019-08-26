package com.acmerobotics.dashboard.message.redux;

import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.MessageType;
import com.acmerobotics.dashboard.telemetry.TelemetryPacket;

import java.util.List;

public class ReceiveTelemetry extends Message {
    private List<TelemetryPacket> telemetry;

    public ReceiveTelemetry(List<TelemetryPacket> packets) {
        super(MessageType.RECEIVE_TELEMETRY);

        telemetry = packets;
    }
}
