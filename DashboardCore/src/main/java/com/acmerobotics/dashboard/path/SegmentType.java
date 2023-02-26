package com.acmerobotics.dashboard.path;

import com.google.gson.annotations.SerializedName;

public enum SegmentType {
    @SerializedName("Line")
    LINE(),
    @SerializedName("Spine")
    SPLINE(),
    @SerializedName("Wait")
    WAIT()

//    final Class<? extends Message> msgClass;
//
//    MessageType(Class<? extends Message> msgClass) {
//        this.msgClass = msgClass;
//    }
}