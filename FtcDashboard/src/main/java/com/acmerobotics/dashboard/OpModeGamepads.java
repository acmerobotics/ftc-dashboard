package com.acmerobotics.dashboard;

import com.qualcomm.robotcore.eventloop.opmode.OpMode;
import com.qualcomm.robotcore.hardware.Gamepad;
import com.qualcomm.robotcore.util.RobotLog;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;

final class OpModeGamepads {
    private static final String TAG = "OpModeGamepads";

    private static final Method NEW_GAMEPAD_DATA_AVAILABLE = findNewGamepadDataAvailable();

    private OpModeGamepads() {}

    static boolean unassociated(OpMode opMode) {
        return opMode.gamepad1.getGamepadId() == Gamepad.ID_UNASSOCIATED
                && opMode.gamepad2.getGamepadId() == Gamepad.ID_UNASSOCIATED;
    }

    static void rest(OpMode opMode) {
        if (unassociated(opMode)) {
            deliver(opMode, new Gamepad(), new Gamepad());
        }
    }

    static void deliver(OpMode opMode, Gamepad gamepad1, Gamepad gamepad2) {
        if (NEW_GAMEPAD_DATA_AVAILABLE == null) {
            opMode.gamepad1.copy(gamepad1);
            opMode.gamepad2.copy(gamepad2);
            return;
        }

        try {
            NEW_GAMEPAD_DATA_AVAILABLE.invoke(opMode, gamepad1, gamepad2);
        } catch (IllegalAccessException e) {
            throw new IllegalStateException(e);
        } catch (InvocationTargetException e) {
            Throwable cause = e.getCause();
            if (cause instanceof RuntimeException) {
                throw (RuntimeException) cause;
            }
            if (cause instanceof Error) {
                throw (Error) cause;
            }
            throw new IllegalStateException(cause);
        }
    }

    private static Method findNewGamepadDataAvailable() {
        try {
            Method method =
                    OpMode.class.getDeclaredMethod(
                            "newGamepadDataAvailable", Gamepad.class, Gamepad.class);
            method.setAccessible(true);
            return method;
        } catch (NoSuchMethodException | SecurityException e) {
            RobotLog.ww(
                    TAG,
                    "OpMode.newGamepadDataAvailable not found; writing dashboard gamepads into"
                            + " gamepad1/gamepad2 directly, which iterative op modes overwrite");
            return null;
        }
    }
}
