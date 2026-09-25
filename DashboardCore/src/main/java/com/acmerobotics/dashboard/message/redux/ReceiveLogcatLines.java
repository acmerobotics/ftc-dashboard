package com.acmerobotics.dashboard.message.redux;

import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.MessageType;
import java.util.List;

public class ReceiveLogcatLines extends Message {
    private List<ReceiveLogcatErrors.LogcatError> lines;

    public ReceiveLogcatLines(List<ReceiveLogcatErrors.LogcatError> lines) {
        super(MessageType.RECEIVE_LOGCAT_LINES);
        this.lines = lines;
    }

    public List<ReceiveLogcatErrors.LogcatError> getLines() {
        return lines;
    }
}
