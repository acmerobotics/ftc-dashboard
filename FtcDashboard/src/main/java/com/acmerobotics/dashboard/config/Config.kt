package com.acmerobotics.dashboard.config

import com.acmerobotics.dashboard.FtcDashboard
import com.qualcomm.robotcore.eventloop.opmode.OpMode


/**
 * Annotation that specifies configuration classes.
 *
 *
 * All public, static, non-final fields of the class will be automatically added as configuration
 * variables in the dashboard. When the user saves new values, these fields are correspondingly
 * updated. Classes annotated with [com.qualcomm.robotcore.eventloop.opmode.Disabled] are
 * ignored.
 */
@Retention(AnnotationRetention.RUNTIME)
@Target(AnnotationTarget.CLASS)
annotation class Config(
    /**
     * Name of this block of configuration variables. Defaults to the class's simple name.
     */
    val value: String = ""
)

fun <T> configurable(category: String, name: String, initial: T) = KotlinValueProvider(initial).also {
    FtcDashboard.getInstance().addConfigVariable(category, name, it)
}


