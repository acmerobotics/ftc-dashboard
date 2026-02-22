package com.acmerobotics.dashboard.hardware;

import static org.firstinspires.ftc.robotcore.external.navigation.CurrentUnit.AMPS;

import com.acmerobotics.dashboard.FtcDashboard;
import com.acmerobotics.dashboard.config.ValueProvider;
import com.acmerobotics.dashboard.config.VariableProvider;
import com.acmerobotics.dashboard.config.variable.BasicVariable;
import com.acmerobotics.dashboard.config.variable.ConfigVariable;
import com.acmerobotics.dashboard.config.variable.CustomVariable;
import com.acmerobotics.dashboard.config.variable.VariableType;
import com.qualcomm.robotcore.eventloop.opmode.OpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.CRServo;
import com.qualcomm.robotcore.hardware.ColorSensor;
import com.qualcomm.robotcore.hardware.DcMotorEx;
import com.qualcomm.robotcore.hardware.DcMotorSimple;
import com.qualcomm.robotcore.hardware.HardwareDevice;
import com.qualcomm.robotcore.hardware.NormalizedColorSensor;
import com.qualcomm.robotcore.hardware.NormalizedRGBA;
import com.qualcomm.robotcore.hardware.Servo;

/**
 * Hardware operation mode that provides real-time hardware configuration and monitoring
 * through the FTC Dashboard interface. This OpMode automatically discovers motors and servos
 * in the hardware map and exposes their configuration and telemetry data through the dashboard.
 *
 * <p>Features include:
 * <ul>
 *   <li>Real-time motor power control and position monitoring</li>
 *   <li>Motor current draw monitoring</li>
 *   <li>Servo position control</li>
 *   <li>Hardware port information display</li>
 *   <li>Dynamic hardware configuration updates</li>
 * </ul>
 */
@TeleOp(name = "Hardware", group = "Dashboard")
public class HardwareOpMode extends OpMode {

    /**
     * Creates a ConfigVariable from a given value using a VariableProvider.
     * This is a utility method for wrapping simple values in the dashboard's variable system.
     *
     * @param <T>   the type of the value
     * @param value the value to wrap
     * @return a ConfigVariable containing the provided value
     */
    public static <T> ConfigVariable<T> createVariableFromValue(T value) {
        return new BasicVariable<>(new VariableProvider<>(value));
    }

    public static <T> ConfigVariable<T> createVariableFromValue(VariableType variableType, T value) {
        return new BasicVariable<>(variableType, new VariableProvider<>(value));
    }

    /**
     * Initializes the hardware monitoring system by setting up the dashboard hardware root.
     * This method is called once when the OpMode is initialized.
     */
    @Override
    public void init() {
        FtcDashboard.getInstance().withHardwareRoot(hardwareRoot -> {
            if (hardwareMapAvailable()) {
                initHardware(hardwareRoot);
            }
        });
    }

    /**
     * Continuously updates hardware configuration and telemetry during the init phase.
     * This method runs in a loop after init() is called but before start() is called.
     * Includes a 100ms sleep to prevent excessive CPU usage.
     */
    @Override
    public void init_loop() {
        FtcDashboard.getInstance().withHardwareRoot(hardwareRoot -> {
            if (hardwareMapAvailable()) {
                setHardware(hardwareRoot);
                updateHardware(hardwareRoot);
            }
        });
    }

    /**
     * Main loop that continuously updates hardware configuration and telemetry data.
     * This method runs repeatedly while the OpMode is active.
     */
    @Override
    public void loop() {
        FtcDashboard.getInstance().withHardwareRoot(hardwareRoot -> {
            if (hardwareMapAvailable()) {
                setHardware(hardwareRoot);
                updateHardware(hardwareRoot);
            }
        });
    }

    /* -------------------- Initialization --------------------- */

    /**
     * Checks if the hardware map is available and not null.
     *
     * @return true if the hardware map is available, false otherwise
     */
    private boolean hardwareMapAvailable() {
        return hardwareMap != null;
    }

    /**
     * Initializes all hardware components by setting up their dashboard variables.
     * This method discovers and configures both motors and servos.
     *
     * @param hardwareRoot the root variable container for hardware components
     */
    private void initHardware(CustomVariable hardwareRoot) {
        initializeMotorVariables(hardwareRoot);
        initializeServoVariables(hardwareRoot);
        initializeCRServoVariables(hardwareRoot);
        initializeColorSensorVariables(hardwareRoot);
    }

    /**
     * Applies configuration changes from the dashboard to the actual hardware devices.
     * This method updates both motors and servos based on dashboard inputs.
     *
     * @param hardwareRoot the root variable container for hardware components
     */
    private void setHardware(CustomVariable hardwareRoot) {
        updateMotorsFromConfig(hardwareRoot);
        updateServosFromConfig(hardwareRoot);
        updateCRServoFromConfig(hardwareRoot);
    }

    /**
     * Updates the dashboard with current hardware state information.
     * This method refreshes telemetry data like motor positions and current draw.
     *
     * @param hardwareRoot the root variable container for hardware components
     */
    private void updateHardware(CustomVariable hardwareRoot) {
        updateMotorStateVariables(hardwareRoot);
        updateColorSensorStateVariables(hardwareRoot);
    }

    /* -------------------- Motor Handling --------------------- */

    /**
     * Discovers all motors in the hardware map and creates dashboard variables for them.
     * Each motor gets variables for power, position, run mode, current draw, and port information.
     *
     * @param hardwareRoot the root variable container to add motor variables to
     */
    private void initializeMotorVariables(CustomVariable hardwareRoot) {
        CustomVariable motors = new CustomVariable();

        for (DcMotorSimple motor : hardwareMap.getAll(DcMotorSimple.class)) {
            if (motor instanceof CRServo) continue; // Handled later
            DcMotorEx motorEx = (DcMotorEx) motor;
            String deviceName = getDeviceName(motorEx);
            if (deviceName == null) continue;

            motors.putVariable(deviceName, createMotorVariable(motorEx));
        }

        hardwareRoot.putVariable("Motors", motors);
    }

    /**
     * Creates a complete dashboard variable structure for a single motor.
     * Includes power control, position monitoring, run mode, current draw, and port info.
     *
     * @param motor the motor to create variables for
     * @return a CustomVariable containing all motor-related dashboard controls and telemetry
     */
    private CustomVariable createMotorVariable(DcMotorEx motor) {
        CustomVariable motorVar = new CustomVariable();
        String hubType = extractHubType(motor.getController().getConnectionInfo());

        motorVar.putVariable("Power", new BasicVariable<>(new ValueProvider<Double>() {
            private double value = 0.0;

            @Override
            public Double get() {
                return value;
            }

            @Override
            public void set(Double newValue) {
                value = newValue;
                motor.setPower(newValue);
            }
        }));

        motorVar.putVariable("Current Position", createVariableFromValue(VariableType.READONLY_STRING, String.valueOf(motor.getCurrentPosition())));
        motorVar.putVariable("Target Position", createVariableFromValue(motor.getTargetPosition()));
        motorVar.putVariable("Run Mode", createVariableFromValue(DcMotorEx.RunMode.RUN_WITHOUT_ENCODER));

        double current = Math.round(motor.getCurrent(AMPS) * 100) / 100.0;
        motorVar.putVariable("Current", createVariableFromValue(current));
        motorVar.putVariable(hubType + " Port", createVariableFromValue(VariableType.READONLY_STRING, String.valueOf(motor.getPortNumber())));

        motorVar.putVariable("Velocity", createVariableFromValue(VariableType.READONLY_STRING, String.valueOf(motor.getVelocity())));

        return motorVar;
    }

    /**
     * Applies configuration changes from the dashboard to all motors.
     * Updates motor run modes and target positions based on dashboard inputs.
     *
     * @param hardwareRoot the root variable container containing motor configurations
     */
    private void updateMotorsFromConfig(CustomVariable hardwareRoot) {
        CustomVariable motorsVar = (CustomVariable) hardwareRoot.getVariable("Motors");
        if (motorsVar == null) return;

        for (DcMotorSimple motor : hardwareMap.getAll(DcMotorSimple.class)) {
            if (motor instanceof CRServo) continue; // Handled later
            DcMotorEx motorEx = (DcMotorEx) motor;
            String motorName = getDeviceName(motorEx);
            if (motorName == null) continue;

            CustomVariable motorVar = (CustomVariable) motorsVar.getVariable(motorName);
            if (motorVar != null) {
                applyMotorConfiguration(motorEx, motorVar);
            }
        }
    }

    /**
     * Applies configuration settings from the dashboard to a specific motor.
     * Handles run mode changes and target position updates with error handling.
     *
     * @param motor  the motor to configure
     * @param config the configuration variables from the dashboard
     */
    private void applyMotorConfiguration(DcMotorEx motor, CustomVariable config) {
        ConfigVariable<?> runModeVar = config.getVariable("Run Mode");
        if (runModeVar != null) {
            motor.setMode((DcMotorEx.RunMode) runModeVar.getValue());
        }

        ConfigVariable<?> targetPosVar = config.getVariable("Target Position");
        if (targetPosVar != null) {
            try {
                motor.setTargetPosition((int) targetPosVar.getValue());
            } catch (Exception e) {
                System.out.println("Error setting target position: " + e);
            }
        }
    }

    /**
     * Updates the dashboard with current motor telemetry data.
     * Refreshes current position and current draw readings for all motors.
     *
     * @param hardwareRoot the root variable container to update with motor telemetry
     */
    private void updateMotorStateVariables(CustomVariable hardwareRoot) {
        CustomVariable motorsVar = (CustomVariable) hardwareRoot.getVariable("Motors");
        if (motorsVar == null) return;

        for (DcMotorSimple motor : hardwareMap.getAll(DcMotorSimple.class)) {
            if (motor instanceof CRServo) continue; // Handled later
            DcMotorEx motorEx = (DcMotorEx) motor;
            String deviceName = getDeviceName(motorEx);
            if (deviceName == null) continue;

            CustomVariable stateUpdate = new CustomVariable();
            stateUpdate.putVariable("Current Position", createVariableFromValue(VariableType.READONLY_STRING, String.valueOf(motorEx.getCurrentPosition())));
            double current = Math.round(motorEx.getCurrent(AMPS) * 100) / 100.0;
            stateUpdate.putVariable("Current", createVariableFromValue(current));

            stateUpdate.putVariable("Velocity", createVariableFromValue(VariableType.READONLY_STRING, String.valueOf(motorEx.getVelocity())));

            CustomVariable existingConfig = (CustomVariable) motorsVar.getVariable(deviceName);
            if (existingConfig != null) {
                existingConfig.update(stateUpdate);
            }
        }
    }

    /* -------------------- Servo Handling --------------------- */

    /**
     * Discovers all servos in the hardware map and creates dashboard variables for them.
     * Each servo gets variables for position control and port information.
     *
     * @param hardwareRoot the root variable container to add servo variables to
     */
    private void initializeServoVariables(CustomVariable hardwareRoot) {
        CustomVariable servos = new CustomVariable();

        for (Servo servo : hardwareMap.getAll(Servo.class)) {
            String deviceName = getDeviceName(servo);
            if (deviceName == null) continue;

            servos.putVariable(deviceName, createServoVariable(servo));
        }

        hardwareRoot.putVariable("Servos", servos);
    }

    /**
     * Creates a dashboard variable structure for a single servo.
     * Includes position control and port information.
     *
     * @param servo the servo to create variables for
     * @return a CustomVariable containing servo-related dashboard controls and info
     */
    private CustomVariable createServoVariable(Servo servo) {
        CustomVariable servoVar = new CustomVariable();
        String hubType = extractHubType(servo.getController().getConnectionInfo());

        servoVar.putVariable("Position", createVariableFromValue(-1.0));
        servoVar.putVariable(hubType + " Port", createVariableFromValue(VariableType.READONLY_STRING, String.valueOf(servo.getPortNumber())));

        return servoVar;
    }

    /**
     * Applies configuration changes from the dashboard to all servos.
     * Updates servo positions based on dashboard inputs.
     *
     * @param hardwareRoot the root variable container containing servo configurations
     */
    private void updateServosFromConfig(CustomVariable hardwareRoot) {
        CustomVariable servosVar = (CustomVariable) hardwareRoot.getVariable("Servos");
        if (servosVar == null) return;

        for (Servo servo : hardwareMap.getAll(Servo.class)) {
            String servoName = getDeviceName(servo);
            if (servoName == null) continue;

            CustomVariable servoVar = (CustomVariable) servosVar.getVariable(servoName);
            if (servoVar != null) {
                applyServoConfiguration(servo, servoVar);
            }
        }
    }

    /**
     * Applies position configuration from the dashboard to a specific servo.
     * Uses -1.0 as a sentinel value to indicate no position change is desired.
     *
     * @param servo  the servo to configure
     * @param config the configuration variables from the dashboard
     */
    private void applyServoConfiguration(Servo servo, CustomVariable config) {
        ConfigVariable<?> positionVar = config.getVariable("Position");
        if (positionVar == null) return;

        double newPosition = (double) positionVar.getValue();
        if (newPosition != -1.0) {
            servo.setPosition(newPosition);
        }
    }

    /* -------------------- CRServo Handling --------------------- */

    /**
     * Discovers all CRServos in the hardware map and creates dashboard variables for them.
     * Each motor gets variables for power and port information.
     *
     * @param hardwareRoot the root variable container to add CRServo variables to
     */
    private void initializeCRServoVariables(CustomVariable hardwareRoot) {
        CustomVariable CRServos = new CustomVariable();

        for (CRServo crservo : hardwareMap.getAll(CRServo.class)) {
            String deviceName = getDeviceName(crservo);
            if (deviceName == null) continue;

            CRServos.putVariable(deviceName, createCRServoVariable(crservo));
        }

        hardwareRoot.putVariable("Continuous Rotation Servos", CRServos);
    }

    /**
     * Creates a complete dashboard variable structure for a single CR Servo.
     * Includes power control and port information.
     *
     * @param servo the CRServo to create variables for
     * @return a CustomVariable containing CRServo-related dashboard controls and info
     */
    private CustomVariable createCRServoVariable(CRServo servo) {
        CustomVariable servoVar = new CustomVariable();
        String hubType = extractHubType(servo.getController().getConnectionInfo());

        servoVar.putVariable("Power", new BasicVariable<>(new ValueProvider<Double>() {
            private double value = 0.0;

            @Override
            public Double get() {
                return value;
            }

            @Override
            public void set(Double newValue) {
                value = newValue;
                servo.setPower(newValue);
            }
        }));

        servoVar.putVariable(hubType + " Port", createVariableFromValue(VariableType.READONLY_STRING, String.valueOf(servo.getPortNumber())));

        return servoVar;
    }

    /**
     * Applies configuration changes from the dashboard to all CRServos.
     * Updates CRServo powers based on dashboard inputs.
     *
     * @param hardwareRoot the root variable container containing CRServo configurations
     */
    private void updateCRServoFromConfig(CustomVariable hardwareRoot) {
        CustomVariable crServosVar = (CustomVariable) hardwareRoot.getVariable("Continuous Rotation Servos");
        if (crServosVar == null) return;

        for (CRServo servo : hardwareMap.getAll(CRServo.class)) {
            String motorName = getDeviceName(servo);
            if (motorName == null) continue;

            CustomVariable servoVar = (CustomVariable) crServosVar.getVariable(motorName);
            if (servoVar != null) {
                applyCRServoConfiguration(servo, servoVar);
            }
        }
    }

    /**
     * Applies configuration settings from the dashboard to a specific motor.
     * Handles power changes.
     *
     * @param servo  the CRServo to configure
     * @param config the configuration variables from the dashboard
     */
    private void applyCRServoConfiguration(CRServo servo, CustomVariable config) {
        ConfigVariable<?> runModeVar = config.getVariable("Power");
        if (runModeVar != null) {
            servo.setPower((Double) runModeVar.getValue());
        }
    }

    /* -------------------- Color Sensor Handling --------------------- */
    /**
     * Discovers all Color Sensors in the hardware map and creates dashboard variables for them.
     * Each sensor gets variables for RGB and port information.
     *
     * @param hardwareRoot the root variable container to add color sensor variables to
     */
    private void initializeColorSensorVariables(CustomVariable hardwareRoot) {
        CustomVariable colorSensors = new CustomVariable();

        for (ColorSensor colorSensor : hardwareMap.getAll(ColorSensor.class)) {
            String deviceName = getDeviceName(colorSensor);
            if (deviceName == null) continue;

            colorSensors.putVariable(deviceName, createColorSensorVariable(colorSensor));
        }

        hardwareRoot.putVariable("Color Sensors", colorSensors);
    }

    /**
     * Creates a complete dashboard variable structure for a single color sensor.
     * Includes RGB and port information.
     *
     * @param colorSensor the color sensor to create variables for
     * @return a CustomVariable containing Color Sensor-related dashboard controls and info
     */
    private CustomVariable createColorSensorVariable(ColorSensor colorSensor) {
        CustomVariable colorSensorVar = new CustomVariable();
        String hubType = extractHubType(colorSensor.getConnectionInfo());

        getColorSensorState(colorSensor, colorSensorVar);

        colorSensorVar.putVariable(hubType + " Port", createVariableFromValue(VariableType.READONLY_STRING, extractI2CPort(colorSensor.getConnectionInfo())));

        return colorSensorVar;
    }

    /**
     * Updates the dashboard with current color sensor telemetry data.
     * Refreshes color readings for all color sensors.
     *
     * @param hardwareRoot the root variable container to update with color sensor telemetry
     */
    private void updateColorSensorStateVariables(CustomVariable hardwareRoot) {
        CustomVariable colorSensorsVar = (CustomVariable) hardwareRoot.getVariable("Color Sensors");
        if (colorSensorsVar == null) return;

        for (ColorSensor colorSensor : hardwareMap.getAll(ColorSensor.class)) {
            String deviceName = getDeviceName(colorSensor);
            if (deviceName == null) continue;

            CustomVariable stateUpdate = new CustomVariable();
            getColorSensorState(colorSensor, stateUpdate);

            CustomVariable existingConfig = (CustomVariable) colorSensorsVar.getVariable(deviceName);
            if (existingConfig != null) {
                existingConfig.update(stateUpdate);
            }
        }
    }

    private void getColorSensorState(ColorSensor colorSensor, CustomVariable stateVariable) {
        stateVariable.putVariable("Red", createVariableFromValue(VariableType.READONLY_STRING, String.valueOf(colorSensor.red())));
        stateVariable.putVariable("Green", createVariableFromValue(VariableType.READONLY_STRING, String.valueOf(colorSensor.green())));
        stateVariable.putVariable("Blue", createVariableFromValue(VariableType.READONLY_STRING, String.valueOf(colorSensor.blue())));

        // Additional handling for preferred methods implemented by common sensors i.e. Rev V3
        if (colorSensor instanceof NormalizedColorSensor) {
            NormalizedColorSensor normColorSensor = (NormalizedColorSensor) colorSensor;
            NormalizedRGBA reading = normColorSensor.getNormalizedColors();
            stateVariable.putVariable("Normalized Red", createVariableFromValue(VariableType.READONLY_STRING, String.valueOf(reading.red)));
            stateVariable.putVariable("Normalized Green", createVariableFromValue(VariableType.READONLY_STRING, String.valueOf(reading.green)));
            stateVariable.putVariable("Normalized Blue", createVariableFromValue(VariableType.READONLY_STRING, String.valueOf(reading.blue)));
        }
    }

    /* -------------------- Utilities --------------------- */

    /**
     * Retrieves the configuration name of a hardware device from the hardware map.
     * Handles cases where a device might have multiple names by returning the first one.
     *
     * @param device the hardware device to get the name for
     * @return the device name, or null if the device is not found or has no names
     */
    private String getDeviceName(Object device) {
        try {
            if (!(device instanceof HardwareDevice)) return null;
            java.util.Set<String> names = hardwareMap.getNamesOf((HardwareDevice) device);
            return names.isEmpty() ? null : names.iterator().next();
        } catch (Exception e) {
            System.out.println("Error obtaining device name: " + e);
            return null;
        }
    }

    /**
     * Extracts and formats the hub type from a device's connection information string.
     * Determines whether a device is connected to a Control Hub or Expansion Hub
     * based on the numeric identifier in the connection info.
     *
     * @param connectionInfo the connection information string from the device
     * @return formatted hub type string (e.g., "Control Hub" or "Expansion Hub 1")
     */
    private String extractHubType(String connectionInfo) {
        String numericPart = "";
        for (int i = 0; i < connectionInfo.length(); i++) {
            if (Character.isDigit(connectionInfo.charAt(i))) {
                numericPart = connectionInfo.substring(i);
                break;
            }
        }
        return numericPart.startsWith("173") ? "Control Hub" : "Expansion Hub " + numericPart;
    }

    private String extractI2CPort(String connectionInfo) {
        String trimmedString = connectionInfo.substring(connectionInfo.indexOf("bus"));
        String numericPart = "";
        for (int i = 0; i < trimmedString.length(); i++) {
            if (Character.isDigit(trimmedString.charAt(i))) {
                numericPart = trimmedString.substring(i);
                break;
            }
        }
        return numericPart.substring(0, 1);
    }
}
