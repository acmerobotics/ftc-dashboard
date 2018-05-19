package com.acmerobotics.dashboard.config;

import com.acmerobotics.dashboard.config.options.Option;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;

import java.util.Map;
import java.util.SortedMap;
import java.util.TreeMap;

public class Configuration {
    private SortedMap<String, Option> options;

    public Configuration() {
        options = new TreeMap<>();
    }

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

    public void addOption(String name, Option option) {
        options.put(name, option);
    }

    public void addOptionsFromClass(Class<?> klass, String name) {
        addOption(name, Option.createFromClass(klass));
    }

    public JsonElement getJson() {
        JsonObject obj = new JsonObject();
        for (Map.Entry<String, Option> entry : options.entrySet()) {
            obj.add(entry.getKey(), entry.getValue().getJson());
        }
        return obj;
    }

    public void updateJson(JsonElement json) {
        JsonObject obj = json.getAsJsonObject();
        for (Map.Entry<String, JsonElement> entry : obj.entrySet()) {
            options.get(entry.getKey()).updateJson(entry.getValue());
        }
    }

    public JsonElement getJsonSchema() {
        JsonObject obj = new JsonObject();
        for (Map.Entry<String, Option> entry : options.entrySet()) {
            obj.add(entry.getKey(), entry.getValue().getSchemaJson());
        }
        return obj;
    }
}
