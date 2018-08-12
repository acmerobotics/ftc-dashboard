package com.acmerobotics.dashboard.config.options;

import com.acmerobotics.dashboard.util.EnumUtil;
import com.acmerobotics.dashboard.config.ValueProvider;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;

/**
 * Enum configuration option.
 */
public class EnumOption extends Option {
    private ValueProvider<Enum> provider;

    public EnumOption(ValueProvider<Enum> provider) {
        this.provider = provider;
    }

    @Override
    public JsonElement getJson() {
        return new JsonPrimitive(provider.get().toString());
    }

    @Override
    public void updateJson(JsonElement element) {
        provider.set(EnumUtil.fromName(element.getAsString(), provider.get().getClass()));
    }

    @Override
    public JsonElement getSchemaJson() {
        JsonObject obj = new JsonObject();
        obj.add("type", new JsonPrimitive(OptionType.ENUM.stringVal));
        JsonArray values = new JsonArray();
        for (Object enumConstant : provider.get().getClass().getEnumConstants()) {
            values.add(new JsonPrimitive(enumConstant.toString()));
        }
        obj.add("values", values);
        return obj;
    }
}
