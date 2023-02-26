package com.acmerobotics.dashboard.path;

public class PathSegment {
    public SegmentType type;
    public double x;
    public double y;
    public double tangent;
    public double time;
    public double heading;
    public HeadingType headingType;

    public PathSegment() {
        this(SegmentType.SPLINE, 0, 0, 0, 0, 0, HeadingType.TANGENT);
        System.out.println("PathSegment Noarg constructor");
    }

    public PathSegment(SegmentType type, double x, double y, double tangent, double time, double heading, HeadingType headingType) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.tangent = tangent;
        this.time = time;
        this.heading = heading;
        this.headingType = headingType;
    }
}