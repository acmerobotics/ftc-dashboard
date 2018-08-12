package com.acmerobotics.dashboard.config.options;

import com.acmerobotics.dashboard.config.ValueProvider;
import com.google.gson.JsonElement;
import com.google.gson.JsonPrimitive;

/**
 * Boolean configuration option.
 */
public class BooleanOption extends Option {
    private ValueProvider<Boolean> provider;

    public BooleanOption(ValueProvider<Boolean> provider) {
        this.provider = provider;
    }

    @Override
    public JsonElement getJson() {
        return new JsonPrimitive(provider.get());
    }

    @Override
    public void updateJson(JsonElement element) {
        provider.set(element.getAsBoolean());
    }

    @Override
    public JsonElement getSchemaJson() {
        return new JsonPrimitive(OptionType.BOOLEAN.stringVal);
    }
}
