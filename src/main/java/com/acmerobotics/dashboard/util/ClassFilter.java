package com.acmerobotics.dashboard.util;

public interface ClassFilter {
    boolean shouldProcessClass(String className);
    void processClass(Class klass);
}
