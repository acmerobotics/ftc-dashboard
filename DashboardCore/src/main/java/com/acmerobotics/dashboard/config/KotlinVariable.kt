package com.acmerobotics.dashboard.config

import com.acmerobotics.dashboard.config.reflection.ArrayProvider
import com.acmerobotics.dashboard.config.reflection.FieldProvider
import com.acmerobotics.dashboard.config.variable.BasicVariable
import com.acmerobotics.dashboard.config.variable.ConfigVariable
import com.acmerobotics.dashboard.config.variable.CustomVariable
import com.acmerobotics.dashboard.config.variable.VariableType
import java.lang.reflect.Array
import java.lang.reflect.Field
import java.lang.reflect.Modifier
import kotlin.properties.ReadOnlyProperty
import kotlin.reflect.KProperty

class KotlinValueProvider<T>(private var value: T) : ReadOnlyProperty<Any, T>, ValueProvider<T> {
    override fun get(): T = value
    override fun set(new: T) {
        value = new
    }

    override fun getValue(thisRef: Any, property: KProperty<*>) = value

    /**
     * Create a ConfigVariable representing this provider's value. If the value is a basic type,
     * a BasicVariable is returned. If the value is a custom object, a CustomVariable is returned
     * whose children are bound to the public (non-final) fields of [value] via reflection,
     * mirroring ReflectionConfig behavior.
     */
    @JvmName("toConfigVariable")
    fun toConfigVariable(): ConfigVariable<*> {
        val v = value ?: return CustomVariable(null)
        val klass = v.javaClass
        return when (VariableType.fromClass(klass)) {
            VariableType.BOOLEAN,
            VariableType.INT,
            VariableType.LONG,
            VariableType.FLOAT,
            VariableType.DOUBLE,
            VariableType.STRING,
            VariableType.ENUM -> BasicVariable(this)
            VariableType.CUSTOM -> createCustomVariableFromInstance(v, klass)
            VariableType.READONLY_STRING -> BasicVariable(VariableType.READONLY_STRING, this)
        }
    }

    private fun createCustomVariableFromInstance(instance: Any, klass: Class<*>): CustomVariable {
        val custom = CustomVariable()
        if (klass.isArray) {
            // represent array elements as children [0], [1], ... similar to ReflectionConfig
            val length = Array.getLength(instance)
            val componentType = klass.componentType
            for (i in 0 until length) {
                val name = i.toString()
                custom.putVariable(name, createVariableFromArrayValue(instance, componentType, intArrayOf(i)))
            }
        } else {
            for (field in klass.fields) {
                if (Modifier.isFinal(field.modifiers)) continue
                val name = field.name
                custom.putVariable(name, createVariableFromField(field, instance))
            }
        }
        return custom
    }

    private fun createVariableFromArrayValue(arrayObj: Any, elementClass: Class<*>, indices: IntArray): ConfigVariable<*> {
        val type = VariableType.fromClass(elementClass)
        return when (type) {
            VariableType.BOOLEAN,
            VariableType.INT,
            VariableType.LONG,
            VariableType.FLOAT,
            VariableType.DOUBLE,
            VariableType.STRING,
            VariableType.ENUM -> object : ConfigVariable<Any>() {
                private val provider = object : ValueProvider<Any> {
                    override fun get(): Any {
                        return try {
                            ArrayProvider.getArrayRecursive(arrayObj, indices) as Any
                        } catch (e: Exception) {
                            @Suppress("UNCHECKED_CAST")
                            null as Any
                        }
                    }

                    override fun set(value: Any) {
                        try {
                            ArrayProvider.setArrayRecursive(arrayObj, value, indices)
                        } catch (_: Exception) {
                        }
                    }
                }

                override fun getType() = type
                override fun getValue(): Any = provider.get()
                override fun update(newVariable: ConfigVariable<Any>) { provider.set(newVariable.value) }
            }
            VariableType.CUSTOM -> {
                val valueAtIndex = try {
                    ArrayProvider.getArrayRecursive(arrayObj, indices)
                } catch (e: Exception) {
                    null
                }
                if (valueAtIndex == null) return CustomVariable(null)
                val custom = CustomVariable()
                val fieldClass = elementClass
                if (fieldClass.isArray) {
                    val length = Array.getLength(valueAtIndex)
                    val componentType = fieldClass.componentType
                    for (i in 0 until length) {
                        val newIdx = indices + i
                        custom.putVariable(i.toString(), createVariableFromArrayValue(valueAtIndex, componentType, newIdx))
                    }
                } else {
                    for (nested in fieldClass.fields) {
                        if (Modifier.isFinal(nested.modifiers)) continue
                        val name = nested.name
                        // Build provider using FieldProvider over the nested field and the object at indices
                        try {
                            custom.putVariable(name, createVariableFromField(nested, valueAtIndex))
                        } catch (_: Exception) {
                        }
                    }
                }
                custom
            }
            VariableType.READONLY_STRING -> BasicVariable(VariableType.READONLY_STRING, this)
        }
    }

    private fun createVariableFromField(field: Field, parent: Any?): ConfigVariable<*> {
        val fieldClass = field.type
        val type = VariableType.fromClass(fieldClass)
        return when (type) {
            VariableType.BOOLEAN,
            VariableType.INT,
            VariableType.LONG,
            VariableType.FLOAT,
            VariableType.DOUBLE,
            VariableType.STRING,
            VariableType.ENUM -> BasicVariable(type, FieldProvider<Any>(field, parent))
            VariableType.CUSTOM -> try {
                val value = field.get(parent)
                if (value == null) {
                    CustomVariable(null)
                } else {
                    if (fieldClass.isArray) {
                        val custom = CustomVariable()
                        val len = Array.getLength(value)
                        for (i in 0 until len) {
                            custom.putVariable(i.toString(), createVariableFromArrayField(field, fieldClass.componentType, parent, intArrayOf(i)))
                        }
                        custom
                    } else {
                        val custom = CustomVariable()
                        for (nestedField in fieldClass.fields) {
                            if (Modifier.isFinal(field.modifiers)) continue
                            val name = nestedField.name
                            custom.putVariable(name, createVariableFromField(nestedField, value))
                        }
                        custom
                    }
                }
            } catch (e: IllegalAccessException) {
                throw RuntimeException(e)
            }
            VariableType.READONLY_STRING -> BasicVariable(VariableType.READONLY_STRING, FieldProvider<Any>(field, parent))
        }
    }

    private fun createVariableFromArrayField(field: Field, fieldClass: Class<*>, parent: Any?, indices: IntArray): ConfigVariable<*> {
        val type = VariableType.fromClass(fieldClass)
        return when (type) {
            VariableType.BOOLEAN,
            VariableType.INT,
            VariableType.LONG,
            VariableType.FLOAT,
            VariableType.DOUBLE,
            VariableType.STRING,
            VariableType.ENUM -> BasicVariable(type, ArrayProvider<Any>(field, parent, *indices))
            VariableType.CUSTOM -> try {
                var value: Any? = null
                try {
                    value = ArrayProvider.getArrayRecursive(field.get(parent), indices)
                } catch (_: ArrayIndexOutOfBoundsException) {
                }
                if (value == null) {
                    CustomVariable(null)
                } else {
                    val custom = CustomVariable()
                    if (fieldClass.isArray) {
                        val newIndices = indices.copyOf(indices.size + 1)
                        val length = Array.getLength(value)
                        for (i in 0 until length) {
                            newIndices[newIndices.size - 1] = i
                            custom.putVariable(i.toString(), createVariableFromArrayField(field, fieldClass.componentType, parent, newIndices))
                        }
                    } else {
                        for (nestedField in fieldClass.fields) {
                            if (Modifier.isFinal(field.modifiers)) continue
                            val name = nestedField.name
                            custom.putVariable(name, createVariableFromField(nestedField, value))
                        }
                    }
                    custom
                }
            } catch (e: IllegalAccessException) {
                throw RuntimeException(e)
            }
            VariableType.READONLY_STRING -> BasicVariable(VariableType.READONLY_STRING, ArrayProvider<Any>(field, parent, *indices))
        }
    }
}

