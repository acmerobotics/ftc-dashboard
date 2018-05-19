package com.acmerobotics.dashboard.config;

import android.util.Log;

import com.acmerobotics.dashboard.RobotDashboard;

import java.lang.reflect.Field;

public class FieldProvider<T> implements ValueProvider<T> {
    private Field field;
    private Object parent;

    public FieldProvider(Field field, Object parent) {
        this.field = field;
        this.parent = parent;
    }

    @Override
    public T get() {
        try {
            return (T) field.get(parent);
        } catch (IllegalAccessException e) {
            Log.w(RobotDashboard.TAG, e);
        }
        return null;
    }

    @Override
    public void set(T value) {
        try {
            field.set(parent, value);
        } catch (IllegalAccessException e) {
            Log.w(RobotDashboard.TAG, e);
        }
    }
}
