package com.acmerobotics.dashboard.message;

import com.acmerobotics.dashboard.util.EnumUtil;
import com.google.gson.JsonDeserializationContext;
import com.google.gson.JsonDeserializer;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParseException;

import java.lang.reflect.Type;

public class MessageDeserializer implements JsonDeserializer<Message> {
    @Override
    public Message deserialize(JsonElement jsonElement, Type type, JsonDeserializationContext jsonDeserializationContext) throws JsonParseException {
        JsonObject messageObj = jsonElement.getAsJsonObject();
        String messageTypeString = messageObj.get("type").getAsString();
        MessageType messageType = EnumUtil.fromValue(messageTypeString, MessageType.class);
        JsonElement data = messageObj.get("data");
        if (data == null) {
            return new Message(messageType);
        } else if (messageType == MessageType.SAVE_CONFIG) {
            return new Message(messageType, data);
        } else {
            throw new RuntimeException("Illegal message: " + messageTypeString);
        }
    }
}
