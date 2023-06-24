package com.acmerobotics.dashboard.canvas;

public class Grid extends CanvasOp {
    private double numHorizontal;
    private double numVertical;
    public Grid(double numHorizontal, double numVertical) {
        super(Type.GRID);

        this.numHorizontal = numHorizontal;
        this.numVertical = numVertical;
    }
}
