package com.acmerobotics.dashboard.message.redux;

import com.acmerobotics.dashboard.path.PathSegment;
import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.MessageType;

import java.util.Arrays;
import java.util.List;

public class UploadPath extends Message {
    public PathSegment start;
    public List<PathSegment> segments;

    public UploadPath(PathSegment start, PathSegment[] segments) {
        super(MessageType.UPLOAD_PATH);

        this.start = start;
        this.segments = Arrays.asList(segments);
    }
}