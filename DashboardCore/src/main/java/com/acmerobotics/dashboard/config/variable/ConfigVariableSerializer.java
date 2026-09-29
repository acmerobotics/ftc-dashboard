package com.acmerobotics.dashboard.config.variable;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;
import com.google.gson.JsonSerializationContext;
import com.google.gson.JsonSerializer;
import java.lang.reflect.Field;
import java.lang.reflect.Type;

public class ConfigVariableSerializer implements JsonSerializer<ConfigVariable<?>> {
    @Override
    public JsonElement serialize(
            ConfigVariable<?> configVariable,
            Type type,
            JsonSerializationContext jsonSerializationContext) {
        Object value = configVariable.getValue();

        JsonObject obj = new JsonObject();
        obj.add(
                ConfigVariable.TYPE_KEY,
                jsonSerializationContext.serialize(configVariable.getType()));

        if (value == null) {
            obj.add(ConfigVariable.VALUE_KEY, null);
            return obj;
        }

        if (value instanceof EnumName) {
            EnumName enumName = (EnumName) value;
            obj.add(ConfigVariable.VALUE_KEY, new JsonPrimitive(enumName.name()));
            if (enumName.className() != null) {
                obj.add(ConfigVariable.ENUM_CLASS_KEY, new JsonPrimitive(enumName.className()));
            }
            return obj;
        }

        if (configVariable.getType() == VariableType.DOUBLE && !Double.isFinite((double) value)) {
            obj.add(ConfigVariable.VALUE_KEY, new JsonPrimitive(String.valueOf(value)));
        } else {
            obj.add(ConfigVariable.VALUE_KEY, jsonSerializationContext.serialize(value));
        }

        if (configVariable.getType() == VariableType.ENUM) {
            // A constant with a body has an anonymous subclass of the enum as its class.
            Class<?> enumClass = ((Enum<?>) value).getDeclaringClass();
            obj.add(ConfigVariable.ENUM_CLASS_KEY, new JsonPrimitive(enumClass.getName()));
            JsonArray values = new JsonArray();
            for (Object o : enumClass.getEnumConstants()) {
                try {
                    Enum<?> e = (Enum<?>) o;
                    String enumName = e.name();
                    Field f = enumClass.getField(enumName);
                    if (f.isAnnotationPresent(Deprecated.class)) {
                        continue;
                    }
                } catch (NoSuchFieldException | SecurityException ignored) {
                    // Keep values when deprecation metadata is unavailable.
                }

                values.add(o.toString());
            }
            obj.add(ConfigVariable.ENUM_VALUES_KEY, values);
        }

        return obj;
    }
}
