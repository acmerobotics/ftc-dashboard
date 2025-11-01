package org.firstinspires.ftc.teamcode;

import com.acmerobotics.dashboard.FtcDashboard;
import com.acmerobotics.dashboard.telemetry.MultipleTelemetry;
import com.acmerobotics.dashboard.config.Config;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import android.util.Log;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.Servo;

/**
 * OpMode to test the Error View in the dashboard.
 *
 * It exposes several static configuration fields (visible/editable in the
 * dashboard when using the acmerobotics @Config system). Toggle these to
 * emit log messages tagged with "OpModeManager" so the client-side ErrorView
 * can observe and display them.
 */
@Config
@TeleOp(name = "ErrorView Test")
public class ErrorViewTestOpMode extends LinearOpMode {

    // Configuration toggles (editable from the dashboard when @Config is supported)
    public static boolean triggerError = false;   // emits a single multi-line error
    public static boolean triggerWarn = false;    // emits a single warning
    public static boolean triggerInfo = false;    // emits a single info message
    public static boolean spam = false;           // emit a burst of error messages
    public static int spamCount = 5;              // number of messages in a spam burst
    public static int spamIntervalMs = 250;       // spacing between spam messages

    // runtime state
    private int spamRemaining = 0;
    private long lastSpamTime = 0L;

    @Override
    public void runOpMode() throws InterruptedException {
        FtcDashboard dashboard = FtcDashboard.getInstance();
        telemetry = new MultipleTelemetry(telemetry, dashboard.getTelemetry());

        telemetry.addData("Info", "Use dashboard Config to toggle test messages (triggerError, triggerWarn, triggerInfo, spam)");
        telemetry.update();

        waitForStart();
        if (isStopRequested()) return;

        while (opModeIsActive()) {
            // Single-shot triggers: when the dashboard toggles these on, send a message
            if (triggerError) {
                // Cause a real hardwareMap error by requesting a non-existent motor
                try {
                    DcMotor m = hardwareMap.get(DcMotor.class, "nonexistent_motor_for_error_view_test");
                    // If it exists unexpectedly, call a method to provoke NPE/other if null
                    if (m != null) {
                        m.setPower(1.0);
                    }
                } catch (RuntimeException e) {
                    // Log the real exception so it appears in Logcat with stack trace
                    Log.e("OpModeManager", "HardwareMap error (missing motor)", e);
                }
                // reset the toggle so it doesn't repeatedly spam
                triggerError = false;
            }

            if (triggerWarn) {
                // Try to get a servo that likely doesn't exist — log as WARN
                try {
                    Servo s = hardwareMap.get(Servo.class, "missing_servo_for_error_view_test");
                    if (s != null) {
                        s.setPosition(0.5);
                    }
                } catch (RuntimeException e) {
                    Log.w("OpModeManager", "HardwareMap warning (missing servo)", e);
                }
                triggerWarn = false;
            }

            if (triggerInfo) {
                // Attempt to access a sensor or device name that will throw — log as INFO
                try {
                    // Using a DcMotor again but treat it as benign info if it fails
                    hardwareMap.get(DcMotor.class, "maybe_missing_motor_for_info");
                } catch (RuntimeException e) {
                    Log.i("OpModeManager", "HardwareMap info (device lookup failed)", e);
                }
                triggerInfo = false;
            }

            if (spam) {
                if (spamRemaining <= 0) {
                    spamRemaining = Math.max(0, spamCount);
                    lastSpamTime = 0L;
                }

                long now = System.currentTimeMillis();
                if (spamRemaining > 0 && (lastSpamTime == 0L || now - lastSpamTime >= Math.max(1, spamIntervalMs))) {
                    try {
                        // Rotate through a few different missing device names to produce varied traces
                        String name = "missing_motor_spam_" + (spamCount - spamRemaining + 1);
                        hardwareMap.get(DcMotor.class, name);
                    } catch (RuntimeException e) {
                        Log.e("OpModeManager", "Spam hardwareMap error (" + (spamCount - spamRemaining + 1) + ")", e);
                    }
                    lastSpamTime = now;
                    spamRemaining--;
                }

                if (spamRemaining <= 0) {
                    // auto-clear the spam toggle so it doesn't repeat
                    spam = false;
                }
            }

            telemetry.addData("triggerError", triggerError);
            telemetry.addData("triggerWarn", triggerWarn);
            telemetry.addData("triggerInfo", triggerInfo);
            telemetry.addData("spam", spam);
            telemetry.addData("spamRemaining", spamRemaining);
            telemetry.update();

            sleep(50);
        }
    }
}
