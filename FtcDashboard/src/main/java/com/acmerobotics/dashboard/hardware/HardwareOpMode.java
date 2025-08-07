package com.acmerobotics.dashboard.hardware;

import static com.acmerobotics.dashboard.config.reflection.ReflectionConfig.createVariableFromValue;
import static org.firstinspires.ftc.robotcore.external.navigation.CurrentUnit.AMPS;

import com.acmerobotics.dashboard.FtcDashboard;
import com.acmerobotics.dashboard.config.ValueProvider;
import com.acmerobotics.dashboard.config.variable.BasicVariable;
import com.acmerobotics.dashboard.config.variable.ConfigVariable;
import com.acmerobotics.dashboard.config.variable.CustomVariable;
import com.qualcomm.robotcore.eventloop.opmode.OpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.DcMotorEx;
import com.qualcomm.robotcore.hardware.DcMotorSimple;
import com.qualcomm.robotcore.hardware.HardwareDevice;
import com.qualcomm.robotcore.hardware.Servo;

@TeleOp(name = "Hardware", group = "Dashboard")
public class HardwareOpMode extends OpMode {
    @Override
    public void init() {
        FtcDashboard.getInstance().withHardwareRoot(hardwareRoot -> {
            if (hardwareMapAvailable()) {
                initHardware(hardwareRoot);
            }
        });
    }

    @Override
    public void init_loop() {
        FtcDashboard.getInstance().withHardwareRoot(hardwareRoot -> {
            if (hardwareMapAvailable()) {
                setHardware(hardwareRoot);
                updateHardware(hardwareRoot);
            }
        });
        sleepMillis(100);
    }

    @Override
    public void loop() {
        FtcDashboard.getInstance().withHardwareRoot(hardwareRoot -> {
            if (hardwareMapAvailable()) {
                setHardware(hardwareRoot);
                updateHardware(hardwareRoot);
            }
        });
    }

    /**
     * Checks if hardwareMap is available.
     */
    private boolean hardwareMapAvailable() {
        return hardwareMap != null;
    }

    /**
     * Sleeps the current thread for the given duration.
     *
     * @param millis milliseconds to sleep
     */
    private void sleepMillis(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException(e);
        }
    }

    /**
     * Initializes hardware variables for motors and servos.
     *
     * @param hardwareRoot the root variable to hold hardware settings
     */
    private void initHardware(CustomVariable hardwareRoot) {
        initializeMotorVariables(hardwareRoot);
        initializeServoVariables(hardwareRoot);
    }

    /**
     * Pushes configuration changes from the dashboard to the hardware.
     *
     * @param hardwareRoot the root variable containing hardware config
     */
    private void setHardware(CustomVariable hardwareRoot) {
        updateMotorsFromConfig(hardwareRoot);
        updateServosFromConfig(hardwareRoot);
    }

    /**
     * Updates state variables (e.g. telemetry) for hardware.
     *
     * @param hardwareRoot the root variable to update
     */
    private void updateHardware(CustomVariable hardwareRoot) {
        updateMotorStateVariables(hardwareRoot);
    }

    private void initializeMotorVariables(CustomVariable hardwareRoot) {
        CustomVariable motors = new CustomVariable();
        for (DcMotorSimple motor : hardwareMap.getAll(DcMotorSimple.class)) {
            DcMotorEx motorEx = (DcMotorEx) motor;
            String deviceName = getDeviceName(motorEx);
            if (deviceName == null) continue;

            CustomVariable motorVar = createMotorVariable(motorEx);
            motors.putVariable(deviceName, motorVar);
        }
        hardwareRoot.putVariable("Motors", motors);
    }

    private CustomVariable createMotorVariable(DcMotorEx motor) {
        CustomVariable motorVar = new CustomVariable();
        String connectionInfo = motor.getController().getConnectionInfo();
        String hubType = extractHubType(connectionInfo);

        motorVar.putVariable("Power", new BasicVariable<>(new ValueProvider<Double>() {
            private double value = 0.0;

            @Override
            public Double get() {
                return value;
            }

            @Override
            public void set(Double newValue) {
                this.value = newValue;
                motor.setPower(newValue);
            }
        }));
        motorVar.putVariable("Current Position", createVariableFromValue(motor.getCurrentPosition()));
        motorVar.putVariable("Target Position", createVariableFromValue(motor.getTargetPosition()));
        motorVar.putVariable("Run Mode", createVariableFromValue(DcMotorEx.RunMode.RUN_WITHOUT_ENCODER));
        double current = Math.round(motor.getCurrent(AMPS) * 100) / 100.0;
        motorVar.putVariable("Current", createVariableFromValue(current));
        motorVar.putVariable(hubType + " Port", createVariableFromValue(motor.getPortNumber()));

        return motorVar;
    }

    private void updateMotorsFromConfig(CustomVariable hardwareRoot) {
        CustomVariable motorsVar = (CustomVariable) hardwareRoot.getVariable("Motors");
        if (motorsVar != null) {
            for (DcMotorSimple motor : hardwareMap.getAll(DcMotorSimple.class)) {
                DcMotorEx motorEx = (DcMotorEx) motor;
                String motorName = getDeviceName(motorEx);
                if (motorName == null) continue;

                CustomVariable motorVar = (CustomVariable) motorsVar.getVariable(motorName);
                if (motorVar != null) {
                    applyMotorConfiguration(motorEx, motorVar);
                }
            }
        }
    }

    private void applyMotorConfiguration(DcMotorEx motor, CustomVariable config) {
        ConfigVariable<?> runModeVar = config.getVariable("Run Mode");
        motor.setMode((DcMotorEx.RunMode) runModeVar.getValue());

        ConfigVariable<?> targetPosVar = config.getVariable("Target Position");
        if (targetPosVar != null) {
            try {
                motor.setTargetPosition((int) targetPosVar.getValue());
            } catch (Exception e) {
                System.out.println("Error setting target position: " + e);
            }
        }
    }

    private void updateMotorStateVariables(CustomVariable hardwareRoot) {
        CustomVariable motorsVar = (CustomVariable) hardwareRoot.getVariable("Motors");
        if (motorsVar == null) return;

        for (DcMotorSimple motor : hardwareMap.getAll(DcMotorSimple.class)) {
            DcMotorEx motorEx = (DcMotorEx) motor;
            String deviceName = getDeviceName(motorEx);
            if (deviceName == null) continue;

            CustomVariable stateUpdate = new CustomVariable();
            stateUpdate.putVariable("Current Position", createVariableFromValue(motorEx.getCurrentPosition()));
            double current = Math.round((motorEx.getCurrent(AMPS) * 100)) / 100.0;
            stateUpdate.putVariable("Current", createVariableFromValue(current));

            CustomVariable existingConfig = (CustomVariable) motorsVar.getVariable(deviceName);
            if (existingConfig != null) {
                existingConfig.update(stateUpdate);
            }
        }
    }

    private void initializeServoVariables(CustomVariable hardwareRoot) {
        CustomVariable servos = new CustomVariable();
        for (Servo servo : hardwareMap.getAll(Servo.class)) {
            String deviceName = getDeviceName(servo);
            if (deviceName == null) continue;

            CustomVariable servoVar = createServoVariable(servo);
            servos.putVariable(deviceName, servoVar);
        }
        hardwareRoot.putVariable("Servos", servos);
    }

    private CustomVariable createServoVariable(Servo servo) {
        CustomVariable servoVar = new CustomVariable();
        String connectionInfo = servo.getController().getConnectionInfo();
        String hubType = extractHubType(connectionInfo);

        servoVar.putVariable("Position", createVariableFromValue(-1.0));
        servoVar.putVariable(hubType + " Port", createVariableFromValue(servo.getPortNumber()));

        return servoVar;
    }

    private void updateServosFromConfig(CustomVariable hardwareRoot) {
        CustomVariable servosVar = (CustomVariable) hardwareRoot.getVariable("Servos");
        if (servosVar != null) {
            for (Servo servo : hardwareMap.getAll(Servo.class)) {
                String servoName = getDeviceName(servo);
                if (servoName == null) continue;

                CustomVariable servoVar = (CustomVariable) servosVar.getVariable(servoName);
                if (servoVar != null) {
                    applyServoConfiguration(servo, servoVar);
                }
            }
        }
    }

    private void applyServoConfiguration(Servo servo, CustomVariable config) {
        ConfigVariable<?> positionVar = config.getVariable("Position");

        if (positionVar != null) {
            double newPosition = (double) positionVar.getValue();

            if (newPosition != -1.0) {
                servo.setPosition(newPosition);
            }
        }
    }

    /**
     * Retrieves the device name from the hardware map.
     *
     * @param device The hardware device
     * @return The device name, or null if not available
     */
    private String getDeviceName(Object device) {
        try {
            if (!(device instanceof HardwareDevice)) {
                return null;
            }
            java.util.Set<String> names = hardwareMap.getNamesOf((HardwareDevice) device);
            if (!names.isEmpty()) {
                return names.iterator().next();
            }
        } catch (Exception e) {
            System.out.println("Error obtaining device name: " + e);
        }
        return null;
    }

    /**
     * Extracts the hub type information from the connection info.
     *
     * @param connectionInfo the connection info string
     * @return "Control Hub" if the numeric part is "173"; otherwise "Expansion Hub <number>"
     */
    private String extractHubType(String connectionInfo) {
        String numericPart = "";
        for (int i = 0; i < connectionInfo.length(); i++) {
            if (Character.isDigit(connectionInfo.charAt(i))) {
                numericPart = connectionInfo.substring(i);
                break;
            }
        }
        return numericPart.equals("173") ? "Control Hub" : "Expansion Hub " + numericPart;
    }
}