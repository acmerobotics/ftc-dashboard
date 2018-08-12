package com.acmerobotics.dashboard.config.options;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import java.util.HashMap;
import java.util.Map;

/**
 * Custom (nested) configuration option.
 */
public class CustomOption extends Option {
    protected Map<String, Option> options;

    public CustomOption() {
        this.options = new HashMap<>();
    }

    public void addOption(String name, Option option) {
        this.options.put(name, option);
    }

    @Override
    public JsonElement getJson() {
        JsonObject obj = new JsonObject();
        for (Map.Entry<String, Option> option : options.entrySet()) {
            obj.add(option.getKey(), option.getValue().getJson());
        }
        return obj;
    }

    @Override
    public void updateJson(JsonElement element) {
        JsonObject obj = element.getAsJsonObject();
        for (Map.Entry<String, JsonElement> entry : obj.entrySet()) {
            options.get(entry.getKey()).updateJson(entry.getValue());
        }
    }

    @Override
    public JsonElement getSchemaJson() {
        JsonObject obj = new JsonObject();
        for (Map.Entry<String, Option> option : options.entrySet()) {
            obj.add(option.getKey(), option.getValue().getSchemaJson());
        }
        return obj;
    }
}
