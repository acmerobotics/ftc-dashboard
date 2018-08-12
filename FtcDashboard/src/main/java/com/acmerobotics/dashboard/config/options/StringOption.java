package com.acmerobotics.dashboard.config.options;

import com.acmerobotics.dashboard.config.ValueProvider;
import com.google.gson.JsonElement;
import com.google.gson.JsonPrimitive;

/**
 * String configuration option.
 */
public class StringOption extends Option {
    private ValueProvider<String> provider;

    public StringOption(ValueProvider<String> provider) {
        this.provider = provider;
    }

    @Override
    public JsonElement getJson() {
        return new JsonPrimitive(provider.get());
    }

    @Override
    public void updateJson(JsonElement element) {
        provider.set(element.getAsString());
    }

    @Override
    public JsonElement getSchemaJson() {
        return new JsonPrimitive(OptionType.STRING.stringVal);
    }
}
