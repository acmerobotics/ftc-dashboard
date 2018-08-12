package com.acmerobotics.dashboard.canvas;

public class Circle extends CanvasOp {
    private double x, y, radius;
    private boolean stroke;

    public Circle(double x, double y, double radius, boolean stroke) {
        super(Type.CIRCLE);

        this.x = x;
        this.y = y;
        this.radius = radius;
        this.stroke = stroke;
    }
}
