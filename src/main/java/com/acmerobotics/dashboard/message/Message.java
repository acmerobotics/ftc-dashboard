package com.acmerobotics.dashboard.message;

public class Message {
    private MessageType type;
    private Object data;

    public Message(MessageType type) {
        this(type, null);
    }

    public Message(MessageType type, Object data) {
        this.type = type;
        this.data = data;
    }

    public MessageType getType() {
        return type;
    }

    public Object getData() {
        return data;
    }
}
