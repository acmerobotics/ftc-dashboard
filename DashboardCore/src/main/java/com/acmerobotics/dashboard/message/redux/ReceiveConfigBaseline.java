package com.acmerobotics.dashboard.message.redux;

import com.acmerobotics.dashboard.config.variable.CustomVariable;
import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.MessageType;

/**
 * Message containing the baseline configuration values (values that were present when deployed to the bot).
 */
public class ReceiveConfigBaseline extends Message {
    private CustomVariable configBaseline;

    public ReceiveConfigBaseline(CustomVariable configBaseline) {
        super(MessageType.RECEIVE_CONFIG_BASELINE);

        this.configBaseline = configBaseline;
    }

    public CustomVariable getConfigBaseline() {
        return configBaseline;
    }
}
