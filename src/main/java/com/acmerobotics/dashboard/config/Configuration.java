package com.acmerobotics.dashboard.config;

import com.acmerobotics.dashboard.config.options.Option;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import java.util.Map;
import java.util.SortedMap;
import java.util.TreeMap;

/**
 * A class that manages configuration variables (i.e., options).
 */
public class Configuration {
    private SortedMap<String, Option> options;

    public Configuration() {
        options = new TreeMap<>();
    }

    /**
     * Adds fields from a class as options.
     * @see Config
     * @param klass
     */
    public void addOptionsFromClass(Class<?> klass) {
        String name = klass.getSimpleName();
        if (klass.isAnnotationPresent(Config.class)) {
            String altName = klass.getAnnotation(Config.class).value();
            if (altName.length() != 0) {
                name = altName;
            }
        }
        addOptionsFromClass(klass, name);
    }

    private void addOption(String name, Option option) {
        options.put(name, option);
    }

    private void addOptionsFromClass(Class<?> klass, String name) {
        addOption(name, Option.createFromClass(klass));
    }

    /**
     * Returns the configuration and option values encoded in JSON.
     */
    public JsonElement getJson() {
        JsonObject obj = new JsonObject();
        for (Map.Entry<String, Option> entry : options.entrySet()) {
            obj.add(entry.getKey(), entry.getValue().getJson());
        }
        return obj;
    }

    /**
     * Uses the provided JSON to update the option values.
     * @param json
     */
    public void updateJson(JsonElement json) {
        JsonObject obj = json.getAsJsonObject();
        for (Map.Entry<String, JsonElement> entry : obj.entrySet()) {
            System.out.println(entry);
            options.get(entry.getKey()).updateJson(entry.getValue());
        }
    }

    /**
     * Returns the configuration schema and option types encoded in JSON. This is *not* the same as
     * {@link #getJson()}.
     */
    public JsonElement getJsonSchema() {
        JsonObject obj = new JsonObject();
        for (Map.Entry<String, Option> entry : options.entrySet()) {
            obj.add(entry.getKey(), entry.getValue().getSchemaJson());
        }
        return obj;
    }
}
