package com.acmerobotics.dashboard.canvas;

public class Image extends CanvasOp {
    private String src;
    private double x;
    private double y;
    private double width;
    private double height;
    private boolean opaque;

    public Image(String src, double x, double y, double width, double height, boolean opaque) {
        super(Type.ALTIMAGE);
        this.src = src;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.opaque = opaque;
    }
}
