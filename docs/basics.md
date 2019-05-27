---
layout: default
---

# Basics

## Telemetry

There are two ways to send telemetry to the dashboard. The first way is through the `telemetry` interface in normal SDK op modes. The second way is specific to the dashboard and is designed to be simpler and more flexible (it's also the preferred method). **Note** that both methods use the same underlying transmission mechanism and **are therefore mutually exclusive**. There is also no **rate limiting** so be careful with sending telemetry too frequently (20ms and slower is probably fine).

### SDK Telemetry

To get a `Telemetry`-compatible instance for the dashboard, you can use `FtcDashboard.getTelemetry()`:

```java
FtcDashboard dashboard = FtcDashboard.getInstance();
Telemetry dashboardTelemetry = dashboard.getTelemetry();

dashboardTelemetry.addData("x", 3.7);
dashboardTelemetry.update();
```

This interface should feel familiar for FTC programmers (note, however, that this doesn't implement some of the less commonly-used methods of `Telemetry`). Additionally, this method is also used in a common idiom for forwarding all normal telemetry messages to the dashboard:

```java
telemetry = new MultipleTelemetry(telemetry, FtcDashboard.getInstance().getTelemetry());
```

This line should be placed near the top of `OpMode.init()` or `LinearOpMode.runOpMode()`.

### Telemetry Packets (preferred)

The second method uses `TelemetryPacket` and is completely independent from normal SDK telemetry. To see how it works, here's the equivalent of the earlier sample:

```java
FtcDashboard dashboard = FtcDashboard.getInstance();

TelemetryPacket packet = new TelemetryPacket();
packet.put("x", 3.7);

dashboard.sendTelemetryPacket(packet);
```

For basic uses, the two methods are fairly similar, although this method has more advanced features. You can use a `TelemetryPacket` to send field overlay drawings:

```java
packet.fieldOverlay()
    .setFill("blue")
    .fillRect(-20, -20, 40, 40);
```

The coordinate system used for the field overlay is fairly standard. The origin is located at the center of the field with the positive X axis pointing toward the Relic mats and the positive Y axis pointing toward the red alliance station. All units are in inches.

## Configuration Variables

To declare configuration variables, add them as `static`, non-`final` fields of a class annotated with `@Config`:

```java
@Config
public class RobotConstants {
    public static int MAGIC_NUMBER = 32;
    public static PIDCoefficients TURNING_PID = new PIDCoefficients();
    // other constants
}
```

When new values are saved in the dashboard, the values of the fields are automatically updated. This reflection-based approach allows changes to occur while the OpMode is running with minimal boilerplate.

Here's the equivalent snippet in Kotlin:

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

The dashboard ships with a camera view for sending images to the dashboard from the RC. For a demo, put a valida Vuforia license in [this op mode](https://github.com/acmerobotics/ftc-dashboard/blob/master/TeamCode/src/main/java/org/firstinspires/ftc/teamcode/VuforiaStreamOpMode.java), run it, and select the Camera layout present on the top right of the dashboard.