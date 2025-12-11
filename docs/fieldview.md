---
layout: default
---

# Field View

Use telemetry packets to draw on the Field View. The method `fieldOverlay()` returns a `Canvas` that records a sequence of drawing operations.

```java
packet.fieldOverlay()
    .setFill("blue")
    .fillRect(-20, -20, 40, 40);
```

All valid [web colors](https://developer.mozilla.org/en-US/docs/Web/HTML/Applying_color#how_to_describe_a_color) are allowed.

Specify coordinates in inches with respect to the [official field frame](official_field_coord_sys.pdf). The origin of the frame is in the center of the mat surface. The positive y-axis extends away from the wall closest to the red alliance station, the positive z-axis rises vertically, and the positive x-axis completes the right-handed frame.

## Images

`drawImage()` lets you add images to the overlay. 
By default, images are drawn in the frame of the webpage which places the origin at the top left of the field square with the positive x-axis proceeding to the right and the positive y-axis proceeding down. The units are still inches.

```java
packet.fieldOverlay()
    .drawImage("/dash/ftc.jpg", 24, 24, 48, 48);
```

The top left of the image will be put at (24, 24) and the image will be fit to a width of 48 by 48 tall.

An overload of `drawImage()` allows rotation of an image and setting the anchor/pivot point. It also supports
drawing in the current transform (custom origin) instead of the page frame.

```java
packet.fieldOverlay()
    .drawImage("/dash/ftc.jpg", 24, 24, 48, 48, Math.toRadians(90), 24, 24, false);
```

Note that different browsers may render non-square image sources differently. Chrome will fit to the square destination likely
stretching the smaller dimension. Firefox will fit the larger dimension to the destination coordinates and preserve the 
aspect ratio by centering the smaller dimension. If you want consistent behavior, edit your custom field image so
that it is square.

Custom images can be added to your project in `TeamCode/src/main/assets/images/` and can be drawn from path `/images/<image>.jpg`. Any image type supported by the browser can be used (jpg, png, webp). See [ImageOpMode](https://github.com/acmerobotics/ftc-dashboard/blob/master/TeamCode/src/main/java/org/firstinspires/ftc/teamcode/ImageOpMode.java) and the [images folder](https://github.com/acmerobotics/ftc-dashboard/tree/master/TeamCode/src/main/assets/images) for an example.

See [client/public](https://github.com/acmerobotics/ftc-dashboard/tree/master/client/public) for the list of built-in images that can be drawn from path `/dash/<image>.jpg`.

## Grids

You can also override the default grid lines. There are normally 7 grid lines including the field
edges in both dimensions. The minimum value is 2 which just draws the field edges.

```java
packet.fieldOverlay()
    .drawGrid(0, 0, 144, 144, 7, 7);
```

Like with `drawImage()`, `drawGrid()` is relative to the page frame, but there is an override that lets you specify a rotation, an anchor point and supports drawing in the current transform.

```java
packet.fieldOverlay()
    .drawGrid(-24, 24, 48, 48, 4, 4, Math.toRadians(45), 24, 24, false);
```

## Text

Text can be rendered with `fillText()` or `strokeText()`. These functions similarly draw by default relative to the page frame 
but can be drawn in the current transform by passing `false` for `usePageFrame`.
```java
packet.fieldOverlay()
    .fillText("Origin", 0, 0, "8px Arial", -Math.toRadians(45), false)
```
The anchor/pivot point for text is at the left end of the text's baseline.

## Custom Origins

Some teams may find the default coordinate system restrictive. Each year the challenge changes and there are often
symmetries that can simplify autonomous navigation if the origin can be transformed. Field Overlay versatility features can
make it easier to directly use your custom coordinate system.

The position of the origin can be set with `setTranslation()`.

```java
packet.fieldOverlay()
    // draw rectangle in the original field frame
    .fillRect(0, 0, 20, 20)
    // shift the field to be anchored in the center of the left side 
    .setTranslation(0, 6 * 12)
    // draw rectangle in the new field frame
    .fillRect(0, 0, 20, 20);
```

Each subsequent call to `setTranslation()` overrides the last one.

The orientation of the field can be changed similarly with `setRotation()`.

```java
packet.fieldOverlay()
    // rotate the field 90 degrees clockwise
    .setRotation(-Math.toRadians(90));
```

Rotation angles are all in radians.

You can also change the scale of drawing operations. This may be useful for changing the coordinate system units.

```java
double inchesPerMeter = 1.0 / 0.0254;
packet.fieldOverlay()
    .setScale(1.0 / metersPerInch, 1.0 metersPerInch);
```

The x and y scale can be set separately, and the scaling is applied **after** any rotation applied by `setRotation()`.

## Drawing Settings

A group of operations don't do anything directly but affect later operations.
```java
packet.fieldOverlay()
    .setStrokeWidth(1)
    .setStroke("green")
    .setFill("red")
    .setAlpha(1.0);
```

## Default Drawing

By default the current season's field image and a grid indicating the tile seams will be drawn, but this
can be suppressed by sending `false` when creating a `TelemetryPacket`.

```java
TelemetryPacket packet1 = new TelemetryPacket(); // default field image will be drawn
TelemetryPacket packet2 = new TelemetryPacket(false); // default field image will be suppressed
```
