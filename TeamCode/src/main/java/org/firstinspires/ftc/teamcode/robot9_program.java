/*

UltimateGoal01

Holonomic Drive

* sqrt transfer function
* normalized power

2020.12.06

*/

package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Disabled;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.eventloop.opmode.OpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DcMotorEx;
import com.qualcomm.robotcore.hardware.DcMotorSimple;
//import com.qualcomm.robotcore.hardware.DigitalChannel;
import com.qualcomm.robotcore.hardware.DistanceSensor;
import com.qualcomm.robotcore.hardware.Servo;
import com.qualcomm.robotcore.util.ElapsedTime;

import org.firstinspires.ftc.robotcore.external.navigation.DistanceUnit;

import static java.lang.Math.abs;
import static java.lang.Thread.sleep;

@TeleOp
public abstract class robot9_program extends OpMode {
    //private Gyroscope imu;
    private DcMotor motorBL;
    private DcMotor motorBR;
    private DcMotor motorFL;
    private DcMotor motorFR;


    double  intakeDir = 1;
    double  intakeChange = -1;
    double sm = 1;
    double poz = 0;
    double gpoz = 0;
    double y, x, rx;
    double max = 0;
    double pmotorBL;
    double pmotorBR;
    double pmotorFL;
    double pmotorFR;
    double lastTime;
    boolean v = true;
    boolean FirstTime = true;
    boolean inchis = false;
    boolean overpower = true;
    boolean permisie = true;
    boolean stopDJ = false;
    boolean tru=false;
    private boolean stop;
    int okGrip = 1;
    //long VoltageSensor;
    public ElapsedTime timer = new ElapsedTime();
    double timeLimit = 0.25;
    int loaderState = -1;

    public void init() {
        motorBL = hardwareMap.get(DcMotor.class, "0"); // Motor Back_Left
        motorBR = hardwareMap.get(DcMotor.class, "2"); // Motor Back-Right
        motorFL = hardwareMap.get(DcMotor.class, "1");// Motor Front-Left
        motorFR = hardwareMap.get(DcMotor.class, "3"); // Motor Front-Right


        motorBL.setDirection(DcMotorSimple.Direction.REVERSE);
        motorFL.setDirection(DcMotorSimple.Direction.REVERSE);
        //  arm2.setDirection(DcMotorSimple.Direction.REVERSE);


        motorBL.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);
        motorBR.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);
        motorFL.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);
        motorFR.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);

        motorFR.setMode(DcMotor.RunMode.RESET_ENCODERS);
        motorFL.setMode(DcMotor.RunMode.RESET_ENCODERS);
        motorBR.setMode(DcMotor.RunMode.RESET_ENCODERS);
        motorBL.setMode(DcMotor.RunMode.RESET_ENCODERS);

        motorFR.setMode(DcMotor.RunMode.RUN_USING_ENCODER);
        motorFL.setMode(DcMotor.RunMode.RUN_USING_ENCODER);
        motorBR.setMode(DcMotor.RunMode.RUN_USING_ENCODER);
        motorBL.setMode(DcMotor.RunMode.RUN_USING_ENCODER);

        //digitalTouch.setMode(DigitalChannel.Mode.INPUT);
        //digitalTouch2.setMode(DigitalChannel.Mode.INPUT);

        //arm.setMode(DcMotor.RunMode.RESET_ENCODERS);
        //arm.setTargetPosition(0);
        //arm.setMode(DcMotor.RunMode.RUN_USING_ENCODER);

        //arm.setMode(DcMotor.RunMode.RUN_USING_ENCODER);

        telemetry.addData("Status", "Initialized");
        telemetry.addData("Resseting", "Encoders");
        telemetry.update();

        // Wait for the game to start (driver presses PLAY)
        // run until the end of the match (driver presses STOP)

        //loader.setPosition(0.0);
    }


    @Override
    public void start(){
        Chassis.start();

    }
    private Thread Chassis = new Thread( new Runnable() {
        @Override
        public void run(){
            while(!stop) {
                tru = true;
                y = -gamepad1.left_stick_y;
                x = gamepad1.left_stick_x * 1.5;
                rx = gamepad1.right_stick_x;

                pmotorFL = y + x + rx;
                pmotorBL = y - x + rx;
                pmotorBR = y + x - rx;
                pmotorFR = y - x - rx;

                max = abs(pmotorFL);
                if (abs(pmotorFR) > max) {
                    max = abs(pmotorFR);
                }
                if (abs(pmotorBL) > max) {
                    max = abs(pmotorBL);
                }
                if (abs(pmotorBR) > max) {
                    max = abs(pmotorBR);
                }
                if (max > 1) {
                    pmotorFL /= max;
                    pmotorFR /= max;
                    pmotorBL /= max;
                    pmotorBR /= max;
                }

                //SLOW-MOTION
                if (gamepad1.left_bumper) {
                    sm = 2;
                    POWER(pmotorFR / sm, pmotorFL / sm, pmotorBR / sm, pmotorBL / sm);
                    //arm.setPower(poz/sm);
                } else {
                    //SLOWER-MOTION
                    if (gamepad1.right_bumper) {
                        sm = 5;
                        POWER(pmotorFR / sm, pmotorFL / sm, pmotorBR / sm, pmotorBL / sm);
                    } else {
                        sm = 0.5;
                        POWER(pmotorFR / sm, pmotorFL / sm, pmotorBR / sm, pmotorBL / sm);
                    }
                }
            }
        }
    });

    public void POWER(double df1, double sf1, double ds1, double ss1){
        motorFR.setPower(df1);
        motorBL.setPower(ss1);
        motorFL.setPower(sf1);
        motorBR.setPower(ds1);
    }


}