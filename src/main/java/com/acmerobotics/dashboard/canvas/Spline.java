package com.acmerobotics.dashboard.canvas;

public class Spline extends CanvasOp {
    private double knotDistance, xOffset, yOffset, headingOffset;
    private double a, b, c, d, e;

    public Spline(double knotDistance, double xOffset, double yOffset, double headingOffset, double a, double b, double c, double d, double e) {
        super(Type.SPLINE);

        this.knotDistance = knotDistance;
        this.xOffset = xOffset;
        this.yOffset = yOffset;
        this.headingOffset = headingOffset;
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
        this.e = e;
    }
}
