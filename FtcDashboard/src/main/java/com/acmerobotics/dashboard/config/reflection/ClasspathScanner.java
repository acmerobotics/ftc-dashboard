package com.acmerobotics.dashboard.config.reflection;

import android.content.Context;
import android.util.Log;

import org.firstinspires.ftc.robotcore.internal.system.AppUtil;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

import dalvik.system.DexFile;

/**
 * Classpath scanning utility designed to find annotations at runtime.
 */
// TODO: should we do this at compile time?
public class ClasspathScanner {
    public static final String TAG = "ClasspathScanner";

    private DexFile dexFile;
    private Callback callback;

    /**
     * {@link ClasspathScanner} callback interface.
     */
    public interface Callback {
        /**
         * Returns whether the given class should be loaded for processing. Preliminary filtering in
         * this step can greatly improve scanning time.
         * @param className class name
         * @return true if the class should be processed
         */
        boolean shouldProcessClass(String className);

        /**
         * Processes the class (for example, checks the presence of an annotation).
         * @param klass class
         */
        void processClass(Class<?> klass);
    }

    /**
     * Creates a new class path object.
     * @param callback callback for handling scanned classes
     */
    public ClasspathScanner(Callback callback) {
        Context context = AppUtil.getInstance().getApplication();
        try {
            this.dexFile = new DexFile(context.getPackageCodePath());
        } catch (IOException e) {
            Log.w(TAG, e);
        }
        this.callback = callback;
    }

    /**
     * Scans the dex file for classes and process them.
     */
    public void scanClasspath() {
        List<String> classNames = Collections.list(dexFile.entries());

        ClassLoader classLoader = ClasspathScanner.class.getClassLoader();

        for (String className : classNames) {
            if (callback.shouldProcessClass(className)) {
                try {
                    Class<?> scannedClass = Class.forName(className, false, classLoader);

                    callback.processClass(scannedClass);
                } catch (ClassNotFoundException | NoClassDefFoundError ignored) {
                    // the dashboard is unable to access many classes; reporting every instance
                    // only clutters the logs
                }
            }
        }
    }
}