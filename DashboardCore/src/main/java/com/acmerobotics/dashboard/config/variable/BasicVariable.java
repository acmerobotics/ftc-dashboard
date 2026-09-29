package com.acmerobotics.dashboard.config.variable;

import com.acmerobotics.dashboard.config.ValueProvider;

public class BasicVariable<T> extends ConfigVariable<T> {
    private VariableType type;
    private ValueProvider<T> provider;
    private Class<?> declaredClass;

    private static <T> VariableType inferType(ValueProvider<T> provider) {
        Object value = provider.get();
        return VariableType.fromClass(
                value instanceof Enum ? ((Enum<?>) value).getDeclaringClass() : value.getClass());
    }

    public BasicVariable(ValueProvider<T> provider) {
        this(inferType(provider), provider);
    }

    public BasicVariable(VariableType type, ValueProvider<T> provider) {
        this(type, provider, null);
    }

    /**
     * Creates a variable that resolves enum values from clients against declaredClass: the class a
     * client names can be another class loader's copy, or missing, under hot reloading.
     */
    public BasicVariable(VariableType type, ValueProvider<T> provider, Class<?> declaredClass) {
        this.type = type;
        this.provider = provider;
        this.declaredClass = declaredClass;
    }

    @Override
    public VariableType getType() {
        return type;
    }

    @Override
    public T getValue() {
        return provider.get();
    }

    @SuppressWarnings("unchecked")
    @Override
    public void update(ConfigVariable<T> newVariable) {
        Object value = newVariable.getValue();
        if (value instanceof EnumName) {
            if (type != VariableType.ENUM) {
                return;
            }
            value = ((EnumName) value).resolve(enumClass());
            if (value == null) {
                return;
            }
        }
        provider.set((T) value);
    }

    private Class<?> enumClass() {
        if (declaredClass != null && declaredClass.isEnum()) {
            return declaredClass;
        }
        T current = provider.get();
        return current instanceof Enum ? ((Enum<?>) current).getDeclaringClass() : null;
    }
}
