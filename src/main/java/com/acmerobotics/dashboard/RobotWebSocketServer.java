package com.acmerobotics.dashboard;

import fi.iki.elonen.NanoWSD;

public class RobotWebSocketServer extends NanoWSD {
    
    private RobotDashboard dashboard;
    
    public RobotWebSocketServer(RobotDashboard dashboard) {
        super(8000);
        this.dashboard = dashboard;
    }

    @Override
    protected WebSocket openWebSocket(IHTTPSession handshake) {
        RobotWebSocket socket = new RobotWebSocket(handshake, dashboard);
        return socket;
    }

}
