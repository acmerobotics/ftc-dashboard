package com.acmerobotics.dashboard.canvas;

public class Image extends CanvasOp {

    private String path;
    private double x, y;
    private double width, height;
    private double theta;
    private boolean usePageFrame;

    public Image(String path, double x, double y, double width, double height, double theta, boolean usePageFrame) {
        super(Type.IMAGE);

        this.path = path;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.theta = theta;
        this.usePageFrame = usePageFrame;
    }
}
