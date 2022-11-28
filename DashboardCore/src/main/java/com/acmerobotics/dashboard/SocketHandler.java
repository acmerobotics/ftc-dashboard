package com.acmerobotics.dashboard;

import com.acmerobotics.dashboard.message.Message;

public interface SocketHandler {
    void onOpen();

    void onClose();

    void onMessage(Message message);
}
