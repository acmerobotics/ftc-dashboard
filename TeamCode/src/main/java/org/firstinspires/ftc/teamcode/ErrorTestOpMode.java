package org.firstinspires.ftc.teamcode;

import com.acmerobotics.dashboard.config.Config;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.Servo;
import com.qualcomm.robotcore.util.ElapsedTime;
import com.qualcomm.robotcore.util.RobotLog;

/**
 * This OpMode intentionally generates various types of errors to test the Error View
 * functionality in the FTC Dashboard. It uses FTC Dashboard configuration variables
 * to trigger different error types through the Config View.
 */
@Config
@TeleOp(name = "Error Test OpMode", group = "Test")
public class ErrorTestOpMode extends LinearOpMode {
    
    private static final String TAG = "OpModeManager";
    private ElapsedTime runtime = new ElapsedTime();
    
    // Configuration variables - change these in the Dashboard Config View to trigger errors
    public static boolean triggerHardwareError = false;
    public static boolean triggerNullPointerError = false;
    public static boolean triggerArrayBoundsError = false;
    public static boolean triggerDivisionByZeroError = false;
    public static boolean triggerCustomError = false;
    public static boolean triggerCustomWarning = false;
    public static boolean enableContinuousErrors = false;
    public static double errorIntervalSeconds = 2.0;
    public static String customErrorMessage = "Test error from dashboard config";
    public static String customWarningMessage = "Test warning from dashboard config";
    
    // Intentionally declare hardware that might not exist
    private DcMotor nonExistentMotor = null;
    private Servo nonExistentServo = null;
    
    // Tracking variables
    private boolean[] errorTriggered = new boolean[6]; // Track if each error type has been triggered
    private double lastErrorTime = 0;
    
    @Override
    public void runOpMode() {
        
        telemetry.addData("Status", "Error Test OpMode Initialized");
        telemetry.addLine("This OpMode generates errors based on Dashboard Config View settings");
        telemetry.addLine("");
        telemetry.addLine("Go to Config View in Dashboard and set these variables to true:");
        telemetry.addLine("• triggerHardwareError - Hardware Not Found Error");
        telemetry.addLine("• triggerNullPointerError - Null Pointer Exception");
        telemetry.addLine("• triggerArrayBoundsError - Array Index Out of Bounds");
        telemetry.addLine("• triggerDivisionByZeroError - Division by Zero");
        telemetry.addLine("• triggerCustomError - Custom Error Message");
        telemetry.addLine("• triggerCustomWarning - Custom Warning Message");
        telemetry.addLine("• enableContinuousErrors - Auto-generate errors periodically");
        telemetry.addLine("");
        telemetry.addLine("You can also customize error messages and timing in Config View");
        telemetry.update();

        waitForStart();
        runtime.reset();

        // Log that the OpMode has started
        RobotLog.ii(TAG, "ErrorTestOpMode started - monitoring dashboard config variables for error triggers");
        
        while (opModeIsActive()) {
            
            // Display runtime and status
            telemetry.addData("Runtime", "%.1f seconds", runtime.seconds());
            telemetry.addData("Status", "Monitoring config variables for error triggers");
            telemetry.addLine();
            
            // Display current config variable states
            telemetry.addData("Config Variables", "Current States:");
            telemetry.addData("  Hardware Error", triggerHardwareError);
            telemetry.addData("  Null Pointer Error", triggerNullPointerError);
            telemetry.addData("  Array Bounds Error", triggerArrayBoundsError);
            telemetry.addData("  Division by Zero Error", triggerDivisionByZeroError);
            telemetry.addData("  Custom Error", triggerCustomError);
            telemetry.addData("  Custom Warning", triggerCustomWarning);
            telemetry.addData("  Continuous Errors", enableContinuousErrors);
            telemetry.addData("  Error Interval", "%.1f seconds", errorIntervalSeconds);
            
            // Check for continuous error generation
            if (enableContinuousErrors && (runtime.seconds() - lastErrorTime) >= errorIntervalSeconds) {
                generateRandomError();
                lastErrorTime = runtime.seconds();
            }
            
            // Test 1: Hardware Not Found Error
            if (triggerHardwareError && !errorTriggered[0]) {
                telemetry.addData("Triggering", "Hardware Not Found Error...");
                telemetry.update();
                generateHardwareNotFoundError();
                errorTriggered[0] = true;
                triggerHardwareError = false; // Reset the trigger
            }
            
            // Test 2: Null Pointer Exception
            if (triggerNullPointerError && !errorTriggered[1]) {
                telemetry.addData("Triggering", "Null Pointer Exception...");
                telemetry.update();
                generateNullPointerException();
                errorTriggered[1] = true;
                triggerNullPointerError = false; // Reset the trigger
            }
            
            // Test 3: Array Index Out of Bounds
            if (triggerArrayBoundsError && !errorTriggered[2]) {
                telemetry.addData("Triggering", "Array Index Out of Bounds...");
                telemetry.update();
                generateArrayIndexOutOfBoundsException();
                errorTriggered[2] = true;
                triggerArrayBoundsError = false; // Reset the trigger
            }
            
            // Test 4: Division by Zero
            if (triggerDivisionByZeroError && !errorTriggered[3]) {
                telemetry.addData("Triggering", "Division by Zero...");
                telemetry.update();
                generateArithmeticException();
                errorTriggered[3] = true;
                triggerDivisionByZeroError = false; // Reset the trigger
            }
            
            // Test 5: Custom Error Log
            if (triggerCustomError) {
                telemetry.addData("Triggering", "Custom Error Log...");
                generateCustomErrorLog();
                triggerCustomError = false; // Reset the trigger
                sleep(100); // Brief pause to prevent spamming
            }
            
            // Test 6: Custom Warning Log
            if (triggerCustomWarning) {
                telemetry.addData("Triggering", "Custom Warning Log...");
                generateCustomWarningLog();
                triggerCustomWarning = false; // Reset the trigger
                sleep(100); // Brief pause to prevent spamming
            }
            
            telemetry.update();
            
            // Small delay to prevent excessive looping
            sleep(100);
        }
        
        // Log when OpMode stops
        RobotLog.ii(TAG, "ErrorTestOpMode stopping");
    }
    
    /**
     * Generates a random error for continuous testing
     * Note: Only generates non-exception errors for continuous mode to prevent OpMode crashes
     */
    private void generateRandomError() {
        int errorType = (int)(Math.random() * 2); // Only use cases 4 and 5 for continuous mode
        
        switch (errorType) {
            case 0:
                RobotLog.ee(TAG, "CONTINUOUS ERROR: Random system error at " + String.format("%.1f", runtime.seconds()) + "s");
                RobotLog.ee(TAG, "CONTINUOUS ERROR: Simulating sensor communication failure");
                break;
            case 1:
                RobotLog.ww(TAG, "CONTINUOUS WARNING: Random system warning at " + String.format("%.1f", runtime.seconds()) + "s");
                RobotLog.ww(TAG, "CONTINUOUS WARNING: Simulating low battery or performance degradation");
                break;
        }
    }
    
    /**
     * Attempts to access hardware that doesn't exist in the hardware map
     * This will cause the OpMode to crash with a hardware exception
     */
    private void generateHardwareNotFoundError() {
        RobotLog.ee(TAG, "About to attempt hardware access that will fail...");
        // Try to get a motor that doesn't exist - this will throw an exception
        nonExistentMotor = hardwareMap.get(DcMotor.class, "nonexistent_motor");
        nonExistentMotor.setPower(0.5);
    }
    
    /**
     * Generates a null pointer exception
     * This will cause the OpMode to crash with a NullPointerException
     */
    private void generateNullPointerException() {
        RobotLog.ee(TAG, "About to trigger null pointer exception...");
        // Intentionally use null object - this will throw NullPointerException
        DcMotor nullMotor = null;
        nullMotor.setPower(0.5); // This will cause NullPointerException and crash the OpMode
    }
    
    /**
     * Generates an array index out of bounds exception
     * This will cause the OpMode to crash with an ArrayIndexOutOfBoundsException
     */
    private void generateArrayIndexOutOfBoundsException() {
        RobotLog.ee(TAG, "About to trigger array index out of bounds...");
        int[] testArray = {1, 2, 3};
        int value = testArray[10]; // Index 10 doesn't exist - will crash the OpMode
    }
    
    /**
     * Generates an arithmetic exception (division by zero)
     * This will cause the OpMode to crash with an ArithmeticException
     */
    private void generateArithmeticException() {
        RobotLog.ee(TAG, "About to trigger division by zero...");
        int result = 100 / 0; // Division by zero - will crash the OpMode
    }
    
    /**
     * Logs a custom error message using the configured message
     */
    private void generateCustomErrorLog() {
        RobotLog.ee(TAG, "CUSTOM ERROR: " + customErrorMessage);
        RobotLog.ee(TAG, "CUSTOM ERROR: Triggered at timestamp " + String.format("%.1f", runtime.seconds()) + "s");
        
        // Don't throw an exception for this one, just log the error
    }
    
    /**
     * Logs a custom warning message using the configured message
     */
    private void generateCustomWarningLog() {
        RobotLog.ww(TAG, "CUSTOM WARNING: " + customWarningMessage);
        RobotLog.ww(TAG, "CUSTOM WARNING: Triggered at timestamp " + String.format("%.1f", runtime.seconds()) + "s");
        
        // Don't throw an exception for this one, just log the warning
    }
}