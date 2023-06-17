package com.acmerobotics.dashboard.canvas;

public class Origin extends CanvasOp {
    private double x;
    private double y;
    public Origin(double x, double y) {
        super(Type.ORIGIN);

        this.x = x;
        this.y = y;
    }
}
