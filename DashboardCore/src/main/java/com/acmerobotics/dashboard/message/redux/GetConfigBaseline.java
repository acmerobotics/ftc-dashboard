package com.acmerobotics.dashboard.message.redux;

import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.MessageType;

/**
 * Message to request the baseline configuration values (values that were present when deployed to the bot).
 */
public class GetConfigBaseline extends Message {
    public GetConfigBaseline() {
        super(MessageType.GET_CONFIG_BASELINE);
    }
}
