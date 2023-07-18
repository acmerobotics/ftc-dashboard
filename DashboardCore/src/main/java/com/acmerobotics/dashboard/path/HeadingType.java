package com.acmerobotics.dashboard.path;

import com.google.gson.annotations.SerializedName;

public enum HeadingType {
    @SerializedName("Tangent")
    TANGENT,
    @SerializedName("Constant")
    CONSTANT,
    @SerializedName("Linear")
    LINEAR,
    @SerializedName("Spline")
    SPLINE
}