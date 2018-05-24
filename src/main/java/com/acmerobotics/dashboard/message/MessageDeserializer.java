package com.acmerobotics.dashboard.message;

import com.acmerobotics.dashboard.util.EnumUtil;
import com.google.gson.JsonDeserializationContext;
import com.google.gson.JsonDeserializer;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParseException;

import java.lang.reflect.Type;

/**
 * Custom deserializer for dashboard messages.
 */
public class MessageDeserializer implements JsonDeserializer<Message> {
    @Override
    public Message deserialize(JsonElement jsonElement, Type type, JsonDeserializationContext jsonDeserializationContext) throws JsonParseException {
        JsonObject messageObj = jsonElement.getAsJsonObject();
        String messageTypeString = messageObj.get("type").getAsString();
        MessageType messageType = EnumUtil.fromName(messageTypeString, MessageType.class);
        JsonElement data = messageObj.get("data");
        return new Message(messageType, data);
    }
}
