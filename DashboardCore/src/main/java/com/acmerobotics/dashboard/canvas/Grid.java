package com.acmerobotics.dashboard.canvas;

public class Grid extends CanvasOp {

    private double x, y;
    private double width, height;
    private int numTicksX, numTicksY;

    public Grid(double x, double y, double width, double height, int numTicksX, int numTicksY) {
        super(Type.GRID);

        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.numTicksX = numTicksX;
        this.numTicksY = numTicksY;
    }
}
