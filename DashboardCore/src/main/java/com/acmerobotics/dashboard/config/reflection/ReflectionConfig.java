package com.acmerobotics.dashboard.config.reflection;

import com.acmerobotics.dashboard.config.variable.BasicVariable;
import com.acmerobotics.dashboard.config.variable.ConfigVariable;
import com.acmerobotics.dashboard.config.variable.CustomVariable;
import com.acmerobotics.dashboard.config.variable.VariableType;

import java.lang.reflect.Array;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;

public class ReflectionConfig {
    private ReflectionConfig() {}

    public static CustomVariable createVariableFromClass(Class<?> configClass) {
        CustomVariable customVariable = new CustomVariable();

        for (Field field : configClass.getFields()) {
            if (!Modifier.isStatic(field.getModifiers())
                    || Modifier.isFinal(field.getModifiers())) {
                continue;
            }
            customVariable.putVariable(field.getName(), createVariableFromField(field, null));
        }

        return customVariable;
    }
    private static ConfigVariable<?>  createVariableFromArrayField(Field field, Object parent, int index) {
        Class<?> fieldClass = field.getType().getComponentType();
        VariableType type = VariableType.fromClass(fieldClass);
        switch (type) {
            case BOOLEAN:
            case INT:
            case DOUBLE:
            case STRING:
            case ENUM:
                return new BasicVariable<>(type, new ArrayProvider<Boolean>(field, parent,index));
            case CUSTOM:
                try {
                    Object value = Array.get(field.get(parent), index);
                    if (value == null) {
                        return new CustomVariable(null);
                    }
                    CustomVariable customVariable = new CustomVariable();
                    if(fieldClass.isArray())
                    {
                        for(int i = 0; i<Array.getLength(value); i++)
                        {
                            customVariable.putVariable(Integer.toString(i), createVariableFromArrayField(field, parent, i));
                        }
                    }
                    else {
                        for (Field nestedField : fieldClass.getFields()) {
                            if (Modifier.isFinal(field.getModifiers())) {
                                continue;
                            }

                            String name = nestedField.getName();
                            customVariable.putVariable(name,
                                    createVariableFromField(nestedField, value));
                        }
                    }
                    return customVariable;
                } catch (IllegalAccessException e) {
                    throw new RuntimeException(e);
                }
            default:
                throw new RuntimeException("Unsupported field type: " +
                        fieldClass.getName());
        }
    }
    private static ConfigVariable<?> createVariableFromField(Field field, Object parent) {
        Class<?> fieldClass = field.getType();
        VariableType type = VariableType.fromClass(fieldClass);
        switch (type) {
            case BOOLEAN:
            case INT:
            case DOUBLE:
            case STRING:
            case ENUM:
                return new BasicVariable<>(type, new FieldProvider<Boolean>(field, parent));
            case CUSTOM:
                try {
                    Object value = field.get(parent);
                    if (value == null) {
                        return new CustomVariable(null);
                    }
                    CustomVariable customVariable = new CustomVariable();
                    if(fieldClass.isArray())
                    {
                        for(int i = 0; i<Array.getLength(value); i++)
                        {
                            customVariable.putVariable(Integer.toString(i), createVariableFromArrayField(field, parent, i));
                        }
                    }
                    else {
                        for (Field nestedField : fieldClass.getFields()) {
                            if (Modifier.isFinal(field.getModifiers())) {
                                continue;
                            }

                            String name = nestedField.getName();
                            customVariable.putVariable(name,
                                    createVariableFromField(nestedField, value));
                        }
                    }
                    return customVariable;
                } catch (IllegalAccessException e) {
                    throw new RuntimeException(e);
                }
            default:
                throw new RuntimeException("Unsupported field type: " +
                        fieldClass.getName());
        }
    }
}
