package com.acmerobotics.dashboard.message.redux;

import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.MessageType;

public class StopLogcatCapture extends Message {
    public StopLogcatCapture() {
        super(MessageType.STOP_LOGCAT_CAPTURE);
    }
}
