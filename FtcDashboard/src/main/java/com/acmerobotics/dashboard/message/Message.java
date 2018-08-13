package com.acmerobotics.dashboard.message;

/**
 * Class for representing dashboard messages.
 */
public class Message {
    private MessageType type;
    private Object data;

    /**
     * Creates a message without a body.
     * @param type message type
     */
    public Message(MessageType type) {
        this(type, null);
    }

    /**
     * Creates a normal message.
     * @param type message type
     * @param data message data (body)
     */
    public Message(MessageType type, Object data) {
        this.type = type;
        this.data = data;
    }

    /**
     * Returns the message type.
     */
    public MessageType getType() {
        return type;
    }

    /**
     * Returns the message data (body).
     */
    public Object getData() {
        return data;
    }
}
