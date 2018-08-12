package com.acmerobotics.dashboard.config.options;

import com.acmerobotics.dashboard.config.ValueProvider;
import com.google.gson.JsonElement;
import com.google.gson.JsonPrimitive;

/**
 * Double configuration option.
 */
public class DoubleOption extends Option {
    private ValueProvider<Double> provider;

    public DoubleOption(ValueProvider<Double> provider) {
        this.provider = provider;
    }

    @Override
    public JsonElement getJson() {
        return new JsonPrimitive(provider.get());
    }

    @Override
    public void updateJson(JsonElement element) {
        provider.set(element.getAsDouble());
    }

    @Override
    public JsonElement getSchemaJson() {
        return new JsonPrimitive(OptionType.DOUBLE.stringVal);
    }
}
