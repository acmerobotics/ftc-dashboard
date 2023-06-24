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

The accessor `fieldOverlay()` returns a `Canvas` that records a sequence of drawing operations.

```java
packet.fieldOverlay()
    .setFill("blue")
    .fillRect(-20, -20, 40, 40);
```

All valid [web colors](https://developer.mozilla.org/en-US/docs/Web/HTML/Applying_color#how_to_describe_a_color) are allowed.

Specify coordinates in inches with respect to the [official field frame](official_field_coord_sys.pdf). The origin of the frame is in the center of the mat surface. The positive y-axis extends away from the wall closest to the red alliance station, the positive z-axis rises vertically, and the positive x-axis completes the right-handed frame.

Some teams may find the default coordinate system restrictive. Each year the challenge changes and there are often
symmetries that can simplify autonomous navigation if the origin can be transformed. Field Overlay versatility features can
make it easier to directly use your custom coordinate system:

You can optionally change the rotation of the rendered field to align with your custom global zero heading. The default rotation of the
field is PI/2 which points the x axis (theta = 0) upwards. To set an alternate rotation, specify an offset to the default rotation in radians:

```java
packet.fieldOverlay()
    //rotate x axis clockwise 90 degrees from the default orientation
    .setRotation(-Math.PI/2);
    //all subsequent CanvasOps will render relative to this new orientation
```
You can optionally change the origin of the rendered field to align with your custom global origin. The default origin of the
field is in the center with the Y axis increasing to the left (rotation matters). To set an alternate origin, specify an offset to the default origin in inches:

```java
packet.fieldOverlay()
    //shift the origin to the middle of the left edge of the rendered field
   .setOrigin(0, 12 * 6);
    //all subsequent CanvasOps will render relative to this updated origin
```

You can optionally change the scale of subsequent drawing operations. This is not needed for a regulation
FTC field where your odometry is measured in inches, but can be useful for custom challenges or odometry measured in meters. 
As an example, imagine your robot is painting the lines on a FIFA soccer field. A soccer field 
is 105 meters long so we'll set scale to 144/105, converting the default field dimensions of 144 inches to 105 meters. 
Then your CanvasOps can be specified in meters.

```java
.setScale(144.0/105.0, 144.0/105.0) //be sure the calculation evaluates to a double and not an int
```

Note that multiple calls to .setScale are cumulative:

```java
.setScale(.5,2) //x-axis will be squished and y-axis operations will be doubled
.setScale(2,.5) //this will undo the previous command for normal scaling        
```

You can optionally load an alternate field image on top of the default field that is updated yearly. This can be
used to support demos using previous year's robots/challenges or to tackle off season challenges with custom fields. It can
even be used as a poor coder's sprite animation, but it is not meant for that. This gets rendered before any custom
scaling, rotations or translations, so the units are 0-144 "inches" starting from the top left (0,0) of the field view.
Different browsers may render non-square image sources differently. Chrome will fit to the square destination likely
stretching the smaller dimension. Firefox will fit the larger dimension to the destination coordinates and preserve the 
aspect ratio by centering the smaller dimension. If you want consistent behavior, edit your custom field image so
that it is square.

```java
.setAltImage("https://upload.wikimedia.org/wikipedia/commons/4/45/Football_field.svg", 0, 0, 144, 144, true)
// or shift and scale the image
//.setAltImage("https://upload.wikimedia.org/wikipedia/commons/4/45/Football_field.svg", 24, 24,48, 48, true)
```
You can override the default gridlines. There are normally 7 gridlines including the field
edges in both dimensions. The minimum value is 2 which just draws the field edges.

```java
.setGrid(13, 13) //sets a grid line at every ft assuming no custom scaling
//.setGrid(2, 2) //no grid - only strokes the field edges
```

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

The camera view can show a live camera stream as demonstrated in [this op mode](https://github.com/acmerobotics/ftc-dashboard/blob/master/TeamCode/src/main/java/org/firstinspires/ftc/teamcode/VuforiaStreamOpMode.java). In brief, use a call like `FtcDashboard.getInstance().startCameraStream(camera, 0);` where `camera` implements `CameraStreamSource`. 

Note: The current server interacts poorly with EasyOpenCV camera V1's implementation of `CameraStreamSource`. Stick with the camera V2 or webcam driver to avoid issues. 
