package com.acmerobotics.dashboard;

import com.acmerobotics.dashboard.message.Message;

public interface SocketHandlerFactory {
    interface SendFun {
        void send(Message message);
    }

    SocketHandler accept(SendFun sendFun);
}
