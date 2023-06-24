package com.acmerobotics.dashboard.canvas;

import java.util.ArrayList;
import java.util.List;

public class Canvas {
    private List<CanvasOp> ops;

    public Canvas() {
        ops = new ArrayList<>();
    }

    public Canvas setAltImage(String src, double x, double y, double width, double height, boolean opaque){
        ops.add(new Image(src, x, y, width, height, opaque));
        return this;
    }

    public Canvas setGrid(double horizontal, double vertical) {
        ops.add(new Grid(horizontal, vertical));
        return this;
    }

    public Canvas setScale(double scaleX, double scaleY) {
        ops.add(new Scale(scaleX, scaleY));
        return this;
    }

    public Canvas setRotation(double radians) {
        ops.add(new Rotation(radians));
        return this;
    }

    public Canvas setOrigin(double x, double y) {
        ops.add(new Origin(x, y));
        return this;
    }

    public Canvas strokeText(String text, double x, double y, String font, double theta) {
        ops.add(new Text(text, x, y, font, theta, true));
        return this;
    }

    public Canvas fillText(String text, double x, double y, String font, double theta) {
        ops.add(new Text(text, x, y, font, theta, false));
        return this;
    }

    public Canvas strokeCircle(double x, double y, double radius) {
        ops.add(new Circle(x, y, radius, true));
        return this;
    }

    public Canvas fillCircle(double x, double y, double radius) {
        ops.add(new Circle(x, y, radius, false));
        return this;
    }

    public Canvas strokePolygon(double[] xPoints, double[] yPoints) {
        ops.add(new Polygon(xPoints, yPoints, true));
        return this;
    }

    public Canvas fillPolygon(double[] xPoints, double[] yPoints) {
        ops.add(new Polygon(xPoints, yPoints, false));
        return this;
    }

    public Canvas strokePolyline(double[] xPoints, double[] yPoints) {
        ops.add(new Polyline(xPoints, yPoints));
        return this;
    }

    public Canvas strokeLine(double x1, double y1, double x2, double y2) {
        strokePolyline(new double[] { x1, x2 }, new double[] { y1, y2 });
        return this;
    }

    public Canvas fillRect(double x, double y, double width, double height) {
        fillPolygon(new double[] { x, x + width, x + width, x },
                new double[] { y, y, y + height, y + height });
        return this;
    }

    public Canvas strokeRect(double x, double y, double width, double height) {
        strokePolygon(new double[] { x, x + width, x + width, x },
                new double[] { y, y, y + height, y + height });
        return this;
    }

    @Deprecated
    public Canvas strokeSpline(double ax, double bx, double cx, double dx, double ex, double fx,
                               double ay, double by, double cy, double dy, double ey, double fy) {
        ops.add(new Spline(ax, bx, cx, dx, ex, fx, ay, by, cy, dy, ey, fy));
        return this;
    }

    public Canvas setFill(String color) {
        ops.add(new Fill(color));
        return this;
    }

    public Canvas setStroke(String color) {
        ops.add(new Stroke(color));
        return this;
    }

    public Canvas setStrokeWidth(int width) {
        ops.add(new StrokeWidth(width));
        return this;
    }

    public List<CanvasOp> getOperations() {
        return ops;
    }

    public void clear() {
        this.ops.clear();
    }
}
