package com.acmerobotics.dashboard.config.variable;

import com.google.gson.Gson;
import com.google.gson.JsonPrimitive;

/** An enum constant as a client sent it, resolved against the variable it updates. */
final class EnumName {
    private static final Gson GSON = new Gson();

    private final String name;
    private final String className;

    EnumName(String name, String className) {
        this.name = name;
        this.className = className;
    }

    String name() {
        return name;
    }

    String className() {
        return className;
    }

    /** Returns the constant this names in enumClass, or in the named class if null; else null. */
    Object resolve(Class<?> enumClass) {
        if (enumClass == null) {
            enumClass = forName(className);
        }
        if (enumClass == null
                || !enumClass.isEnum()
                || (className != null && !className.equals(enumClass.getName()))) {
            return null;
        }

        Object constant = GSON.fromJson(new JsonPrimitive(name), enumClass);
        if (constant != null) {
            return constant;
        }

        // The client offers toString() values, which can differ from name() and @SerializedName.
        for (Object candidate : enumClass.getEnumConstants()) {
            if (candidate.toString().equals(name)) {
                return candidate;
            }
        }
        return null;
    }

    private static Class<?> forName(String className) {
        if (className == null) {
            return null;
        }
        try {
            return Class.forName(className, false, EnumName.class.getClassLoader());
        } catch (ClassNotFoundException e) {
            return null;
        }
    }
}
