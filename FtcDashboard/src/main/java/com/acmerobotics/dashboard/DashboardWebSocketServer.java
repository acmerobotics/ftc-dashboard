package com.acmerobotics.dashboard;

import fi.iki.elonen.NanoWSD;

/**
 * WebSocket server that handles dashboard client connections.
 */
public class DashboardWebSocketServer extends NanoWSD {
    private static final int PORT = 8000;
    
    private FtcDashboard dashboard;
    
    DashboardWebSocketServer(FtcDashboard dashboard) {
        super(PORT);
        this.dashboard = dashboard;
    }

    @Override
    protected WebSocket openWebSocket(IHTTPSession handshake) {
        return new DashboardWebSocket(handshake, dashboard);
    }

}
