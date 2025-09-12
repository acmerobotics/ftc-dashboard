package com.acmerobotics.dashboard.struct;

import com.acmerobotics.dashboard.telemetry.TelemetryPacket;

public class StructTelemetryPacket<T> extends TelemetryPacket {
    public final Struct<T> struct;

    public StructTelemetryPacket(Struct<T> struct) {
        this.struct = struct;
    }


}
