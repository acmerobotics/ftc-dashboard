package com.acmerobotics.dashboard.config.options;

import com.acmerobotics.dashboard.config.ValueProvider;
import com.google.gson.JsonElement;
import com.google.gson.JsonPrimitive;

/**
 * Integer configuration option.
 */
public class IntOption extends Option {
    private ValueProvider<Integer> provider;

    public IntOption(ValueProvider<Integer> provider) {
        this.provider = provider;
    }

    @Override
    public JsonElement getJson() {
        return new JsonPrimitive(provider.get());
    }

    @Override
    public void updateJson(JsonElement element) {
        provider.set(element.getAsInt());
    }

    @Override
    public JsonElement getSchemaJson() {
        return new JsonPrimitive(OptionType.INT.stringVal);
    }
}
