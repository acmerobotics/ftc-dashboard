package com.acmerobotics.dashboard;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Build-time dashboard settings. Put the annotation on any one class in your project.
 *
 * <pre>
 * &#64;DashboardSettings(limelightProxy = false)
 * public class RobotConstants { }
 * </pre>
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
public @interface DashboardSettings {
    /**
     * Whether the dashboard may proxy a Limelight on ports 5800-5807.
     *
     * @return true to allow the dashboard's Limelight proxy (the default)
     */
    boolean limelightProxy() default true;
}
