package com.acmerobotics.dashboard.canvas;

import com.google.gson.annotations.SerializedName;

public abstract class CanvasOp {
    public enum Type {
        @SerializedName("circle")
        CIRCLE,

        @SerializedName("polygon")
        POLYGON,

        @SerializedName("polyline")
        POLYLINE,

        @SerializedName("spline")
        SPLINE,

        @SerializedName("stroke")
        STROKE,

        @SerializedName("fill")
        FILL,

        @SerializedName("strokeWidth")
        STROKE_WIDTH;
    }

    private Type type;

    public CanvasOp(Type type) {
        this.type = type;
    }
}
