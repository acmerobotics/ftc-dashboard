package com.acmerobotics.dashboard.message.redux;

import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.MessageType;

public class StartLogcatCapture extends Message {
    public StartLogcatCapture() {
        super(MessageType.START_LOGCAT_CAPTURE);
    }
}
