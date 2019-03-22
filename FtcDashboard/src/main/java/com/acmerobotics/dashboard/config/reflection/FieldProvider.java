package com.acmerobotics.dashboard.config.reflection;

import android.util.Log;

import com.acmerobotics.dashboard.config.ValueProvider;

import java.lang.reflect.Field;

/**
 * Value provider backed by a class field.
 * @param <T> type of the class field
 */
public class FieldProvider<T> implements ValueProvider<T> {
    private static final String TAG = "FieldProvider";

    private Field field;
    private Object parent;

    public FieldProvider(Field field, Object parent) {
        this.field = field;
        this.parent = parent;
    }

    @SuppressWarnings("unchecked")
    @Override
    public T get() {
        try {
            return (T) field.get(parent);
        } catch (IllegalAccessException e) {
            Log.w(TAG, e);
        }
        return null;
    }

    @Override
    public void set(T value) {
        try {
            field.set(parent, value);
        } catch (IllegalAccessException e) {
            Log.w(TAG, e);
        }
    }
}
