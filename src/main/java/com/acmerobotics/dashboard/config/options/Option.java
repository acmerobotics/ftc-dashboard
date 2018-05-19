package com.acmerobotics.dashboard.config.options;

import android.util.Log;

import com.acmerobotics.dashboard.config.FieldProvider;
import com.google.gson.JsonElement;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;

import static com.acmerobotics.dashboard.RobotDashboard.TAG;

public abstract class Option {
    public abstract JsonElement getJson();
    public abstract void updateJson(JsonElement element);
    public abstract JsonElement getSchemaJson();

    public static Option createFromClass(Class<?> klass) {
        CustomOption customOption = new CustomOption();
        for (Field field : klass.getFields()) {
            if (!Modifier.isStatic(field.getModifiers()) || Modifier.isFinal(field.getModifiers())) {
                continue;
            }

            customOption.addOption(field.getName(), createFromField(field, null));
        }
        return customOption;
    }

    public static Option createFromField(Field field, Object parent) {
        Class<?> klass = field.getType();
        switch (OptionType.fromClass(klass)) {
            case BOOLEAN:
                return new BooleanOption(new FieldProvider<>(field, parent));
            case INT:
                return new IntOption(new FieldProvider<>(field, parent));
            case DOUBLE:
                return new DoubleOption(new FieldProvider<>(field, parent));
            case STRING:
                return new StringOption(new FieldProvider<>(field, parent));
            case ENUM:
                return new EnumOption(new FieldProvider<>(field, parent));
            case CUSTOM:
                CustomOption option = new CustomOption();
                for (Field nestedField : klass.getFields()) {
                    if (Modifier.isFinal(field.getModifiers())) {
                        continue;
                    }

                    String name = nestedField.getName();
                    try {
                        option.addOption(name, createFromField(nestedField, field.get(parent)));
                    } catch (IllegalAccessException e) {
                        Log.w(TAG, e);
                    }
                }

                return option;
            default:
                throw new RuntimeException("unable to create field from class: " + klass.getSimpleName());
        }
    }
}
