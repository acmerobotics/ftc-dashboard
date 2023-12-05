---
layout: default
---

# Features

## Telemetry

FTC apps keep the dashboard updated through periodic telemetry transmissions. Telemetry packets contain text key-value pairs like the provided SDK interfaces. They also store graphics to be displayed over the field image.

Packets have a map-like interface for adding unstructured data.

```java
TelemetryPacket packet = new TelemetryPacket();
packet.put("x", 3.7);
packet.put("status", "alive");
```

The accessor `fieldOverlay()` returns a `Canvas` that records a sequence of drawing operations that show up in the Field View.

```java
packet.fieldOverlay()
    .setFill("blue")
    .fillRect(-20, -20, 40, 40);
```

Check out [this page](fieldview) for more information on Field View drawing.

Use `FtcDashboard#sendTelemetryPacket()` to dispatch complete packets.

```java
FtcDashboard dashboard = FtcDashboard.getInstance();
dashboard.sendTelemetryPacket(packet);
```

For convenience, the dashboard offers a restricted implementation of `Telemetry`.

```java
FtcDashboard dashboard = FtcDashboard.getInstance();
Telemetry dashboardTelemetry = dashboard.getTelemetry();

dashboardTelemetry.addData("x", 3.7);
dashboardTelemetry.update();
```

Each call to `update()` sends a packet with the data since the last call. Be careful: this indirection can mask the presence of multiple `sendTelemetryPacket()` calls in a single loop iteration.

A common idiom combines DS and dashboard telemetry together.

```java
public class MultipleTelemetryExampleOpMode extends OpMode {
    @Override
    public void init() {
        telemetry = new MultipleTelemetry(telemetry, FtcDashboard.getInstance().getTelemetry());

        // ...
    }

    // ...
}
```

## Configuration Variables

Configuration variables are special fields that the dashboard client can seamlessly modify while the app is running. To mark a field as a config variable, declare it `static` and not `final` and annotate the enclosing class with `@Config`.

```java
@Config
public class RobotConstants {
    public static int MAGIC_NUMBER = 32;
    public static PIDCoefficients TURNING_PID = new PIDCoefficients();
    // other constants
}
```

It's conventional to name variables in uppercase and treat them as constants inside the code. While saved dashboard changes instantly apply to the code fields, code-side changes only propagate to the client on explicit refresh.

Also, keep the copy semantics of Java primitives in mind when using this feature. Why does the following op mode fail to observe position offset changes during operation?

```java
public class ServoArm {
    private Servo servo;
    private double posOffset;

    public ServoArm(HardwareMap hardwareMap, double posOffset) {
        this.servo = hardwareMap.get(Servo.class, "servo");
        this.posOffset = posOffset;
    }

    public void setPosition(double pos) {
        servo.setPosition(posOffset + pos);
    }
}

@Config
public class StaleServoOpMode extends LinearOpMode {
    public static double SERVO_POS_OFFSET = 0.27;

    @Override
    public void runOpMode() {
        ServoArm arm = new ServoArm(hardwareMap, SERVO_POS_OFFSET);

        waitForStart();

        while (opModeIsActive()) {
            arm.setPosition(-gamepad1.left_stick_y);
        }
    }
}
```

The value of `SERVO_POS_OFFSET` is read once at the start of the op mode to pass to the `ServoArm` constructor. The field `posOffset` gets an independent copy of `SERVO_POS_OFFSET`; it only gets the new `SERVO_POS_OFFSET` when the op mode is reinitialized.

With some slight adjustments, position offset modifications can appear truly live,

```java
@Config
public class ServoArm {
    public static double POS_OFFSET = 0.27;

    private Servo servo;

    public ServoArm(HardwareMap hardwareMap) {
        this.servo = hardwareMap.get(Servo.class, "servo");
    }

    public void setPosition(double pos) {
        servo.setPosition(POS_OFFSET + pos);
    }
}

public class FixedServoOpMode extends LinearOpMode {
    @Override
    public void runOpMode() {
        ServoArm arm = new ServoArm(hardwareMap);

        waitForStart();

        while (opModeIsActive()) {
            arm.setPosition(-gamepad1.left_stick_y);
        }
    }
}
```

Java experts may have noticed that `POS_OFFSET` can still be stale or partially updated. If this bothers you, mark all your config variable fields with `volatile`. You can read more about word tearing in [JLS 17.7](https://docs.oracle.com/javase/specs/jls/se8/html/jls-17.html#jls-17.7).

Config variable declarations in Kotlin are cumbersome but still possible with `@JvmField`.

```kotlin
@Config
object RobotConstants {
    @JvmField var MAGIC_NUMBER = 32
    @JvmField var TURNING_PID = PIDCoefficients()
    // other constants
}
```

## Op Mode Controls

Op mode controls replicate limited DS functionality. Some gamepads are supported for testing in a pinch. Plug them in and press Start-A/B as usual to activate. Dashboard gamepads will have higher latency and less robustness than DS ones and should be used accordingly. Safety mechanisms attempt to stop the robot if gamepads spontaneously disconnect, but there are no guarantees.

## Camera

Teams may be interested in previewing the two different vision systems, vision portal and traditional EasyOpenCV. The vision portal API was introduced in CenterStage 2023-2024 and it's usage with FTC dashboard is documented [in this op mode](https://github.com/acmerobotics/ftc-dashboard/blob/master/TeamCode/src/main/java/org/firstinspires/ftc/teamcode/VisionPortalStreamingOpMode.java).

It is also possible to use traditional EasyOpenCV, using a call like `FtcDashboard.getInstance().startCameraStream(camera, 0);` where `camera` implements `CameraStreamSource`. In EasyOpenCV, this camera will be the same one you initialize with the code below.

```java
int cameraMonitorViewId = hardwareMap.appContext.getResources().getIdentifier("cameraMonitorViewId", "id", hardwareMap.appContext.getPackageName());
OpenCvWebcam camera = OpenCvCameraFactory.getInstance().createWebcam(hardwareMap.get(WebcamName.class, "Webcam 1"), cameraMonitorViewId);
FtcDashboard.getInstance().startCameraStream(camera, 0);
```
