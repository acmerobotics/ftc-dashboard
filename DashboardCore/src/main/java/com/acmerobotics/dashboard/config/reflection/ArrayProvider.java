package com.acmerobotics.dashboard.config.reflection;

import com.acmerobotics.dashboard.config.ValueProvider;

import java.lang.reflect.Array;
import java.lang.reflect.Field;

public class ArrayProvider<T> implements ValueProvider<T> {
    private final Field field;
    private final Object parent;
    private final int index;
    public ArrayProvider(Field field, Object parent, int index) {
        this.field = field;
        this.parent = parent;
        this.index = index;
    }
    @SuppressWarnings("unchecked")
    @Override
    public T get() {
        try {
            return (T) Array.get(field.get(parent),index);
        } catch (IllegalAccessException e) {
            throw new RuntimeException(e);
        } catch(ArrayIndexOutOfBoundsException e)
        {
            return null;
        }
    }
    @Override
    public void set(T value) {
        try {
            Array.set(field.get(parent),index, value);
        } catch (IllegalAccessException e) {
            throw new RuntimeException(e);
        }catch(ArrayIndexOutOfBoundsException ignored) { }
    }
}
