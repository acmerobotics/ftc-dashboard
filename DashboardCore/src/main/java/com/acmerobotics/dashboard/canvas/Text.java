package com.acmerobotics.dashboard.canvas;

public class Text extends CanvasOp {
    private String text;
    private double x;
    private double y;
    private String font;
    private double theta;
    private boolean stroke;

    public Text(String text, double x, double y, String font, double theta, boolean stroke) {
        super(Type.TEXT);
        this.text = text;
        this.x = x;
        this.y = y;
        this.font = font;
        this.theta = theta;
        this.stroke = stroke;
    }
}
