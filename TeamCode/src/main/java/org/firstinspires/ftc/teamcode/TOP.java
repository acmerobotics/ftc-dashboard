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
import com.qualcomm.robotcore.hardware.DigitalChannel;
import com.qualcomm.robotcore.hardware.Servo;
import com.qualcomm.robotcore.util.ElapsedTime;

import static java.lang.Math.abs;
import static java.lang.Thread.sleep;

@TeleOp
public class TOP extends OpMode {
    //private Gyroscope imu;
    private DcMotor motorBL;
    private DcMotor motorBR;
    private DcMotor motorFL;
    private DcMotor motorFR;
    private DcMotor intake;
    private DcMotorEx shuter;
    private DcMotorEx arm;
    private DcMotorEx arm2;
    private DcMotorEx DJL;
    private DcMotor grip;
    private Servo loader1;
    private Servo loader2;
    private Servo grabber_left;
    private Servo grabber_right;
    private DigitalChannel digitalTouch;
    private DigitalChannel digitalTouch2;
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
        motorBL = hardwareMap.get(DcMotor.class, "1"); // Motor Back-Left
        motorBR = hardwareMap.get(DcMotor.class, "4"); // Motor Back-Right
        motorFL = hardwareMap.get(DcMotor.class, "2"); // Motor Front-Left
        motorFR = hardwareMap.get(DcMotor.class, "3"); // Motor Front-Right
        arm     = (DcMotorEx) hardwareMap.dcMotor.get("gheara");
        arm2    = (DcMotorEx) hardwareMap.dcMotor.get("gheara2");
        DJL     = (DcMotorEx) hardwareMap.dcMotor.get("roata");
        //grabber_left   = hardwareMap.servo.get("gheara");
        //grabber_right  = hardwareMap.servo.get("grabber_right");
        loader1        = hardwareMap.servo.get("cutie");
        loader2        = hardwareMap.servo.get("gheara 2");
        digitalTouch   = hardwareMap.get(DigitalChannel.class, "rotila1");
        digitalTouch2   = hardwareMap.get(DigitalChannel.class, "rotila2");


        motorBL.setDirection(DcMotorSimple.Direction.REVERSE);
        motorFL.setDirection(DcMotorSimple.Direction.REVERSE);
        //  arm2.setDirection(DcMotorSimple.Direction.REVERSE);


        motorBL.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);
        motorBR.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);
        motorFL.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);
        motorFR.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);
        DJL.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);
        arm.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);

        motorFR.setMode(DcMotor.RunMode.RESET_ENCODERS);
        motorFL.setMode(DcMotor.RunMode.RESET_ENCODERS);
        motorBR.setMode(DcMotor.RunMode.RESET_ENCODERS);
        motorBL.setMode(DcMotor.RunMode.RESET_ENCODERS);

        motorFR.setMode(DcMotor.RunMode.RUN_USING_ENCODER);
        motorFL.setMode(DcMotor.RunMode.RUN_USING_ENCODER);
        motorBR.setMode(DcMotor.RunMode.RUN_USING_ENCODER);
        motorBL.setMode(DcMotor.RunMode.RUN_USING_ENCODER);

        digitalTouch.setMode(DigitalChannel.Mode.INPUT);
        digitalTouch2.setMode(DigitalChannel.Mode.INPUT);

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
        Systems.start();
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
    private Thread Systems = new Thread( new Runnable() {
        @Override
        public void run() {
            while (!stop) {
            /*
        if(gamepad1.a)
        {
            motorFL.setPower(-0.08);
            motorFR.setPower(0.08);
            motorBL.setPower(-0.08);
            motorBR.setPower(0.08);
        }
        */
/*
                //ARM-UP
                if (gamepad1.dpad_up) {
                    while (gamepad1.dpad_up) {
                        poz--;
                        arm.setPower(poz);
                    }
                }
                arm.setPower(0);
                poz = 0;


                //ARM-DOWN
                if (gamepad1.dpad_down) {
                    while (gamepad1.dpad_down) {
                        poz  ;
                        arm.setPower(poz);
                    }
                }
                arm.setPower(0);
                poz = 0;

 */

                //DJL
                //  if (gamepad2.x) {
                //    if (stopDJ == true)
                //      stopDJ = false;
                //  DJL.setPower(0.4);
                // else DJL.setPower(0);
                // stopDJ = true;

                DJL.setPower(gamepad2.left_stick_y);



                if (gamepad1.back)
                    arm.setMode(DcMotor.RunMode.RESET_ENCODERS);
                /*if (gamepad2.dpad_left)
                    arm.setMode(DcMotor.RunMode.RESET_ENCODERS);*/


                /*
                if (arm.getCurrentPosition() >= 250)
                {
                    arm.setPower(gamepad1.left_stick_y / 10);
                }
                 */


                //  if (gamepad1.y)
                //   loader1.setPosition(0.6);
                //   if (gamepad1.a)
                //   loader1.setPosition(1);

                // if (gamepad1.y)
                //   loader2.setPosition(0.2);
                // if (gamepad1.a)
                //     loader2.setPosition(0);

                if (gamepad2.y)
                    loader1.setPosition(0.6);
                if (gamepad2.a)
                    loader1.setPosition(0.8);

                if (gamepad2.y)
                    loader2.setPosition(0.2);
                if (gamepad2.a)
                    loader2.setPosition(0);

                if (digitalTouch.getState() == false) {
                    motorFL.setPower(-0.48);
                    motorFR.setPower(0.48);
                    motorBL.setPower(0.48);
                    motorBR.setPower(-0.48);
                }






/*
        BUN
        if (loader.getPosition() == 1.0 && arm.getCurrentPosition() == 100 ) //90
        {
            loader.setPosition(0.0);
            inchis = false;
        }
*/
                /*
                if (overpower = true) {
                    if (inchis == true) {
                        if (loader.getPosition() == 1.0 && arm.getCurrentPosition() <= 430 && arm.getCurrentPosition() >= 420) //90
                        {
                            inchis = false;
                            loader.setPosition(0.0);

                        }
                    }
                }
                */

        /*
        if (loader.getPosition() == 1.0 && arm.getCurrentPosition() >= 300)
        {
            loader.setPosition(0.0);
            inchis = false;
        }
        */

        /*
        if (permisie == true || permisie == false) {
            if (gamepad1.right_stick_y > 0 || gamepad1.right_stick_y < 0)
                permisie = true;
                arm.setPower(gamepad1.right_stick_y / 1.5);
    }
         */

        /*
        if (permisie == true) {
            if (gamepad1.x) {
                permisie = false;
                arm.setMode(DcMotor.RunMode.RESET_ENCODERS);
            }
        }
         */

                //bun
        /*
        if (gamepad1.x)
            if (gamepad1.right_stick_y < 0)
                arm.setPower(0);
         */


                /*
                if (gamepad1.right_stick_y > 0 || gamepad1.right_stick_y < 0) {
                    arm.setPower(gamepad1.right_stick_y);
                    /*
                    if (arm.getCurrentPosition() < 250)
                    {
                        arm.setPower(gamepad1.right_stick_y / 10);
                    }
                     */

                // arm.setPower(gamepad1.right_stick_y);
                //if (arm.getCurrentPosition() <= 0)
                //if (gamepad1.right_stick_y < 0)
                //arm.setPower(0);

                //if (arm.getCurrentPosition() >= 250)
                //arm.setPower(gamepad1.right_stick_y / 10);


                //gamepad2
                //if (gamepad2.right_stick_y > 0 || gamepad2.right_stick_y < 0) {
                //arm.setPower(gamepad2.right_stick_y);
                //if (arm.getCurrentPosition() <= 0)
                //if (gamepad2.right_stick_y < 0)
                // arm.setPower(0);
                //if (gamepad2.right_stick_y > 0 || gamepad2.right_stick_y < 0) {
                arm.setPower(gamepad2.right_stick_y);
                arm2.setPower(gamepad2.right_stick_y);


                /*
                if (arm.getCurrentPosition() <= 0)
                    if (gamepad2.right_stick_y < 0)
                        arm.setPower(0);
                 */


                if (gamepad1.b) {
                    //while(arm.getCurrentPosition() != 160)
                    //arm.setTargetPosition(160);
                    //arm.setMode(DcMotor.RunMode.RUN_TO_POSITION);
                    //arm.setPower(1.0);
                    arm.setTargetPosition(160);
                    arm.setMode(DcMotor.RunMode.RUN_TO_POSITION);
                    arm.setPower(1.0);
                    while (arm.isBusy()) ;
                    arm.setPower(0);
                    arm.setMode(DcMotor.RunMode.RUN_USING_ENCODER);
                    lastTime = System.currentTimeMillis();
                    while (lastTime + 0 > System.currentTimeMillis()) {
                    }
                }

                if (gamepad1.dpad_left) {
                    //while(arm.getCurrentPosition() != 160)
                    //arm.setTargetPosition(160);
                    //arm.setMode(DcMotor.RunMode.RUN_TO_POSITION);
                    //arm.setPower(1.0);
                    arm.setTargetPosition(0);
                    arm.setMode(DcMotor.RunMode.RUN_TO_POSITION);
                    arm.setPower(1.0);
                    while (arm.isBusy()) ;
                    arm.setPower(0);
                    arm.setMode(DcMotor.RunMode.RUN_USING_ENCODER);
                    lastTime = System.currentTimeMillis();
                    while (lastTime + 0 > System.currentTimeMillis()) {
                    }
                }

                if (gamepad1.dpad_right) {
                    //while(arm.getCurrentPosition() != 160)
                    //arm.setTargetPosition(160);
                    //arm.setMode(DcMotor.RunMode.RUN_TO_POSITION);
                    //arm.setPower(1.0);
                    arm.setTargetPosition(550);
                    arm.setMode(DcMotor.RunMode.RUN_TO_POSITION);
                    arm.setPower(1.0);
                    while (arm.isBusy()) ;
                    arm.setPower(0);
                    arm.setMode(DcMotor.RunMode.RUN_USING_ENCODER);
                    lastTime = System.currentTimeMillis();
                    while (lastTime + 0 > System.currentTimeMillis()) {
                    }
                }

                //gamepad2
                if (gamepad2.x) {
                    //while(arm.getCurrentPosition() != 160)
                    //arm.setTargetPosition(160);
                    //arm.setMode(DcMotor.RunMode.RUN_TO_POSITION);
                    //arm.setPower(1.0);
                    arm.setTargetPosition(420);
                    arm.setMode(DcMotor.RunMode.RUN_TO_POSITION);
                    arm.setPower(0.9);
                    while (arm.isBusy()) ;
                    arm.setPower(0);
                    arm.setMode(DcMotor.RunMode.RUN_USING_ENCODER);
                    lastTime = System.currentTimeMillis();
                    while (lastTime + 0 > System.currentTimeMillis()) {
                    }
                }

                if (gamepad2.dpad_down) {
                    //while(arm.getCurrentPosition() != 160)
                    //arm.setTargetPosition(160);
                    //arm.setMode(DcMotor.RunMode.RUN_TO_POSITION);
                    //arm.setPower(1.0);
                    arm.setTargetPosition(5);
                    arm.setMode(DcMotor.RunMode.RUN_TO_POSITION);
                    arm.setPower(1.0);
                    while (arm.isBusy()) ;
                    arm.setPower(0);
                    arm.setMode(DcMotor.RunMode.RUN_USING_ENCODER);
                    lastTime = System.currentTimeMillis();
                    while (lastTime + 0 > System.currentTimeMillis()) {
                    }
                }


                arm.setMode(DcMotor.RunMode.RUN_WITHOUT_ENCODER);
            }
        }
    });



    public void stop(){stop = true;}

    public void loop(){
        telemetry.addData("Left Bumper", gamepad1.left_bumper);
        telemetry.addData("Brat pozitie: ", arm.getCurrentPosition());
        telemetry.addData("Poz: ", poz);
        telemetry.addData("inchis: ", inchis);
        telemetry.addData("permisie: ", permisie);
        telemetry.addData("asdf: ", gamepad1.right_stick_y);
        telemetry.addData("thread: ", tru);
        telemetry.addData("Button", digitalTouch.getState());
        telemetry.addData("Button2", digitalTouch2.getState());
        telemetry.update();
    }
    public void POWER(double df1, double sf1, double ds1, double ss1){
        motorFR.setPower(df1);
        motorBL.setPower(ss1);
        motorFL.setPower(sf1);
        motorBR.setPower(ds1);
    }
}
