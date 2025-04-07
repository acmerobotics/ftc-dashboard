package com.acmerobotics.dashboard.config;

public class VariableProvider<T> implements ValueProvider<T> {
    private T value;

    public VariableProvider(T value) {
        this.value = value;
    }

    @Override
    public T get() {
        return value;
    }

    @Override
    public void set(T value) {
        this.value = value;
    }
}
