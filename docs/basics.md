---
layout: default
---

# Basics

## Telemetry

There are two ways to send telemetry to the dashboard: through the familiar `Telemetry` interface or dashboard-specific telemetry packets. The former is provided for convenience in smaller op modes, while the latter is preferred for more elaborate routines that aggregate telemetry from many files or display field overlays.

In general, one **should not use both in the same op mode** as the contents of each new packet overwrite the last. 

### SDK Telemetry

The method `FtcDashboard#getTelemetry()` returns a `Telemetry` implementation that can be used as follows.

```java
FtcDashboard dashboard = FtcDashboard.getInstance();
Telemetry dashboardTelemetry = dashboard.getTelemetry();

dashboardTelemetry.addData("x", 3.7);
dashboardTelemetry.update();
```

This is commonly used in the following op mode idiom that dispatches `OpMode#telemetry` calls to both the Driver Station and the dashboard.

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

Note that many lesser-known `Telemetry` methods are **not** implemented (e.g., `Telemetry#speak()`).

### Telemetry Packets (preferred)

The second method uses `TelemetryPacket` and is completely separate from normal SDK telemetry. Here's a rewritten version of the earlier sample:

```java
FtcDashboard dashboard = FtcDashboard.getInstance();

TelemetryPacket packet = new TelemetryPacket();
packet.put("x", 3.7);

dashboard.sendTelemetryPacket(packet);
```

This interface also support more advanced features. You can use a `TelemetryPacket` to send field overlay drawings.

```java
packet.fieldOverlay()
    .setFill("blue")
    .fillRect(-20, -20, 40, 40);
```

The field overlay accepts uses the official field coordinate system described in [this document](official_field_coord_sys.pdf). A right-handed coordinate frame is anchored at the center of the field. The positive Z axis rises perpendicular to the tiles and the positive Y axis extends toward the red alliance station.

All coordinates are specified in inches.

## Configuration Variables

Configuration variables are live-editable fields that can be modified by the dashboard while the Robot Controller app is running. These variables are usually declared as `static`, non-`final` fields of a class annotated with `@Config`.

```java
@Config
public class RobotConstants {
    public static int MAGIC_NUMBER = 32;
    public static PIDCoefficients TURNING_PID = new PIDCoefficients();
    // other constants
}
```

The dashboard uses reflection to seamlessly update the fields without additional boilerplate. However, this requires some care to avoid stale values. Consider the following hardware class and op mode.

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
    private static double SERVO_POS_OFFSET = 0.27;

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

At first it may seem like changes to `SERVO_POS_OFFSET` will affect the servo position will affect the op mode while it's running. But a _copy_ of `SERVO_POS_OFFSET` is passed to the `ServoArm` constructor instead of a _reference_ because it's a primitive type. Thus, after the op mode is initialized, `posOffset` doesn't change regardless of how `SERVO_POS_OFFSET` changes. A better version of this code is shown below.

```java
@Config
public class ServoArm {
    private static double POS_OFFSET = 0.27;

    private Servo servo;

    public ServoArm(HardwareMap hardwareMap) {
        this.servo = hardwareMap.get(Servo.class, "servo");
    }

    public void setPosition(double pos) {
        servo.setPosition(POS_OFFSET + pos);
    }
}

public class StaleServoOpMode extends LinearOpMode {
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

In this new version, live changes are now immediately visible to `ServoArm#setPosition()`.

Java experts may have noticed that `POS_OFFSET` can still be stale or perhaps even partially updated. If this bothers you, mark all of your config variable fields with `volatile`. You can read more about this in [JLS 17.7](https://docs.oracle.com/javase/specs/jls/se8/html/jls-17.html#jls-17.7).

Config variable declarations of this sort are also possible in Kotlin with `@JvmField`.

```kotlin
@Config
object RobotConstants {  
    @JvmField var MAGIC_NUMBER = 32
    @JvmField var TURNING_PID = PIDCoefficients()
    // other constants
}
```

## OpMode Management

The dashboard has a little widget for starting and stopping op modes (like the DS) for convenience and DS-less testing. There is also gamepad support; simply plug the gamepads into your computer and press Start-A/B as usual. Note: there is a sizable latency when using the gamepads so this feature is unsuitable for major teleop practice.

## Camera

The dashboard ships with a camera view for sending images to the dashboard from the RC. For a demo, put a valid Vuforia license in [this op mode](https://github.com/acmerobotics/ftc-dashboard/blob/master/TeamCode/src/main/java/org/firstinspires/ftc/teamcode/VuforiaStreamOpMode.java), run it, and select the "Camera" layout present on the top right of the dashboard.
