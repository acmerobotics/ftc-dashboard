package com.acmerobotics.dashboard.config;

public class ConstantProvider<T> implements ValueProvider<T> {
    private T value;

    public ConstantProvider(T value) {
        this.value = value;
    }

    @Override
    public T get() {
        return value;
    }

    @Override
    public void set(T value) {
        // do nothing
        // TODO: is failure appropriate?
    }
}
