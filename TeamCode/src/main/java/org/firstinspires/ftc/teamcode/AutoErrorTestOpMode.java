package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.util.RobotLog;

/**
 * A simple autonomous OpMode that generates OpModeManager errors for testing
 * the Error View functionality. This version runs automatically without gamepad input.
 */
@Autonomous(name = "Auto Error Test", group = "Test")
public class AutoErrorTestOpMode extends LinearOpMode {
    
    private static final String TAG = "OpModeManager";
    
    @Override
    public void runOpMode() {
        
        telemetry.addData("Status", "Auto Error Test OpMode Ready");
        telemetry.addLine("This OpMode will automatically generate errors every few seconds");
        telemetry.addLine("Check the Error View in the dashboard to see the results");
        telemetry.update();
        
        waitForStart();
        
        RobotLog.ii(TAG, "AutoErrorTestOpMode started - will generate errors automatically");
        
        int errorCount = 0;
        
        while (opModeIsActive() && errorCount < 20) { // Generate 20 errors then stop
            
            errorCount++;
            telemetry.addData("Error Test", "Generating error #%d", errorCount);
            telemetry.addData("Status", "Check Error View in dashboard");
            telemetry.update();
            
            try {
                switch (errorCount % 6) {
                    case 1:
                        // Hardware configuration error
                        RobotLog.ee(TAG, "ERROR #" + errorCount + ": Failed to initialize motor 'drive_motor' - device not found in hardware map");
                        DcMotor fakeMotor = hardwareMap.get(DcMotor.class, "nonexistent_drive_motor");
                        break;
                        
                    case 2:
                        // Sensor error
                        RobotLog.ee(TAG, "ERROR #" + errorCount + ": IMU sensor initialization failed - device not responding");
                        throw new RuntimeException("IMU initialization timeout");
                        
                    case 3:
                        // Communication error
                        RobotLog.ww(TAG, "WARNING #" + errorCount + ": Lost communication with expansion hub - attempting reconnection");
                        sleep(100);
                        RobotLog.ee(TAG, "ERROR #" + errorCount + ": Expansion hub reconnection failed after 3 attempts");
                        break;
                        
                    case 4:
                        // Vision error
                        RobotLog.ee(TAG, "ERROR #" + errorCount + ": Camera initialization failed - USB device not found");
                        RobotLog.ee(TAG, "ERROR #" + errorCount + ": AprilTag detection pipeline crashed with null pointer exception");
                        break;
                        
                    case 5:
                        // Power/voltage error
                        RobotLog.ww(TAG, "WARNING #" + errorCount + ": Low battery voltage detected: 11.2V (minimum recommended: 12.0V)");
                        RobotLog.ee(TAG, "ERROR #" + errorCount + ": Critical battery voltage: 10.8V - emergency stop triggered");
                        break;
                        
                    case 0:
                        // General OpMode error
                        RobotLog.ee(TAG, "ERROR #" + errorCount + ": OpMode execution exception - division by zero in autonomous navigation");
                        int result = 42 / 0; // This will cause ArithmeticException
                        break;
                }
                
            } catch (Exception e) {
                RobotLog.ee(TAG, "EXCEPTION #" + errorCount + ": Caught exception in AutoErrorTestOpMode: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            }
            
            // Wait 2 seconds between errors to make them readable in the Error View
            sleep(2000);
        }
        
        RobotLog.ii(TAG, "AutoErrorTestOpMode completed - generated " + errorCount + " test errors");
        telemetry.addData("Status", "Error generation complete");
        telemetry.addData("Errors Generated", errorCount);
        telemetry.addLine("Check the Error View to see all logged errors");
        telemetry.update();
        
        // Keep the OpMode running for a bit so users can see the final telemetry
        sleep(5000);
    }
}