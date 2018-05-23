package com.acmerobotics.dashboard.util;

import java.lang.reflect.Field;

/**
 * Useful methods for dealing with enums.
 */
public class EnumUtil {
    /**
     * Gets the enum value that matches the provided name.
     * @param name enum value name
     * @param enumClass enum class
     * @return enum value or null if not found
     */
    public static <T extends  Enum> T fromName(String name, Class<T> enumClass) {
        for (T type : enumClass.getEnumConstants()) {
            try {
                Field field = enumClass.getField(type.name());
                if (field.getName().equals(name)) {
                    return type;
                }
            } catch (NoSuchFieldException e) {
                e.printStackTrace();
            }
        }
        return null;
    }

}
