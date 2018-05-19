package com.acmerobotics.dashboard.config;

public interface ValueProvider<T> {
    T get();
    void set(T value);
}
