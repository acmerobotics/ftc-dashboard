---
layout: default
---

# Field View

## Setup

Telemetry packets can store graphics to be displayed in the Field View. 

By default the current season's field image and a grid indicating the tile seams will be drawn, but this
can be suppressed by sending false when allocating the TelemetryPacket:

```java
TelemetryPacket packet = new TelemetryPacket(); //default field image will be drawn
//or 
//TelemetryPacket packet = new TelemetryPacket(false); //default field image will be suppressed
```

The accessor `fieldOverlay()` returns a `Canvas` that records a sequence of drawing operations.

```java
packet.fieldOverlay()
    .setFill("blue")
    .fillRect(-20, -20, 40, 40);
```

All valid [web colors](https://developer.mozilla.org/en-US/docs/Web/HTML/Applying_color#how_to_describe_a_color) are allowed.

Specify coordinates in inches with respect to the [official field frame](official_field_coord_sys.pdf). The origin of the frame is in the center of the mat surface. The positive y-axis extends away from the wall closest to the red alliance station, the positive z-axis rises vertically, and the positive x-axis completes the right-handed frame.

## Field Transforms Support a Custom Origin
Some teams may find the default coordinate system restrictive. Each year the challenge changes and there are often
symmetries that can simplify autonomous navigation if the origin can be transformed. Field Overlay versatility features can
make it easier to directly use your custom coordinate system:

You can optionally change the rotation of the rendered field to align with your custom global zero heading. The default rotation of the
field points the x axis (theta = 0) upwards. To set an alternate rotation, specify an offset to the default rotation in radians:

```java
packet.fieldOverlay()
    //rotate x axis clockwise 90 degrees from the default orientation
    .setRotation(-Math.PI/2);
    //all subsequent CanvasOps will render relative to this new orientation
```
You can optionally translate the origin of the rendered field to align with your custom global translation. The default translation of the
field is in the center with the Y axis increasing to the left (rotation matters). To set an alternate translation, specify an offset to the default translation in inches:

```java
packet.fieldOverlay()
    //shift the origin to the middle of the left edge of the rendered field
   .setTranslation(0, 12 * 6);
    //all subsequent CanvasOps will render relative to this updated origin
```

You can optionally change the scale of subsequent drawing operations. This is not needed for a regulation
FTC field where your odometry is measured in inches, but can be useful for custom challenges or odometry measured in meters. 
As an example, imagine your robot is painting the lines on a FIFA soccer field. A soccer field 
is 105 meters long so we could set the scale to 144/105, converting the default field dimensions of 144 inches to 105 meters. 
Then your CanvasOps can be specified in meters.

```java
.setScale(144.0/105.0, 144.0/105.0) //be sure the calculation evaluates to a double and not an int
```

## Images, Grids and Text

.drawImage() lets you add images to the overlay. Images that can be rendered by browsers include PNGs, JPGs and SVGs.
By default images will be drawn in the "Page Frame" transform which is how a standard HTML Canvas is setup.
This means that the default origin for this operation is the top left of the Field View with X increasing to the right
and Y increasing downward.

```java
.drawImage("/dash/ftc.jpg", 24, 24, 48, 48)
```

The top left of the image will be put at (24,24) and the image will be fit to a width of 48 by 48 tall.

An overload of drawImage allows rotation of an image and setting the anchor/pivot point. It also supports
drawing in the current transform (custom origin) instead of the Page Frame.

```java
.drawImage("/dash/ftc.jpg", 24, 24, 48, 48, Math.PI/2, 24, 24, false)
```

Note that different browsers may render non-square image sources differently. Chrome will fit to the square destination likely
stretching the smaller dimension. Firefox will fit the larger dimension to the destination coordinates and preserve the 
aspect ratio by centering the smaller dimension. If you want consistent behavior, edit your custom field image so
that it is square.

You can override the default grid lines. There are normally 7 grid lines including the field
edges in both dimensions. The minimum value is 2 which just draws the field edges.

```java
//this is how to draw the default grid if you disable the default field
//this will be drawn in the pageFrame orientation
.drawGrid(0, 0, 144, 144, 7, 7)
```

Like with drawImage, drawGrid is relative to the Page Frame, but an override lets you specify a rotation, an anchor point and supports drawing in the current transform:

```java
//draw a 4ft tic tac toe grid at (-2',+2') rotated 45 degrees around its center relative to the current origin: 
//this will be drawn in the pageFrame orientation
.drawGrid(-24, 24, 48, 48, 4, 4, Math.toRadians(45), 24, 24, false)
```

Text can be rendered with fillText or strokeText. These functions similarly draw by default relative to the Page Frame
but can be drawn in the current transform by providing usePageFrame = false:
```java
//draw a label for the origin that starts at the origin but is rotated 45 degrees counter clockwise in the current transform
.fillText("Origin", 0, 0, "8px Arial", -Math.PI/4, false)
```
The anchor/pivot point for text is at the left end of the text's baseline

## Settings
A group of operations don't do anything directly but instead set conditions for subsequent operations:
```java
.setStrokeWidth(1)
.setStroke("green")
.setFill("red")
.setAlpha(1.0) //set the global alpha value, only affects subsequent operations
```
## Drawing Operations

Drawing operations always execute in the current transform. They typically have both stroke and fill versions. Stroke versions include:

```java
.strokeLine(0, 0, 0, 24) //draw a y axis marker
.strokeRect(-24,-24,24,24) //draw a box around the four tiles at the origin
.strokeCircle(0, 0, ORBITAL_RADIUS) //draw a circle centered at the current origin
double[] bxPoints = {0, SIDE_LENGTH * 2, 0};
double[] byPoints = {l, 0, -l};
.strokePolygon(bxPoints, byPoints) //draw a triangle
.strokePolyline(bxPoints,byPoints) //doesn't connect the ending point to the beginning point
//there is also a deprecated .strokeSpline, but you are on your own exploring that
```
