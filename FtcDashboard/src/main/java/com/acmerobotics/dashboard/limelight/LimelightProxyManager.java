package com.acmerobotics.dashboard.limelight;

import com.qualcomm.robotcore.util.RobotLog;

import java.io.IOException;

/**
 * Opens a set of local servers on the Control Hub that forward traffic to the
 * Limelight 3A sitting on the internal USB-Ethernet network at 172.29.0.1.
 * <p>
 * The Limelight exposes several services the dashboard client needs:
 * <ul>
 *   <li><b>5800</b> – MJPEG camera stream (HTTP, chunked)</li>
 *   <li><b>5801</b> – Web dashboard UI (HTTP)</li>
 *   <li><b>5805</b> – WebSocket interface (raw TCP)</li>
 *   <li><b>5807</b> – REST API for status &amp; config (HTTP)</li>
 * </ul>
 * Because the Limelight's subnet isn't routable from the browser, these
 * forwarders let the client reach every service at the same port numbers on
 * the Control Hub's Wi-Fi address.
 */
public class LimelightProxyManager {
    private static final String TAG = "dashboard:LLProxy";
    private static final String LL_ADDR = "172.29.0.1";

    private HttpForwarder mjpegForwarder;   // :5800  (streamed)
    private HttpForwarder dashForwarder;    // :5801  (buffered)
    private TcpForwarder  wsForwarder;      // :5805  (raw TCP)
    private HttpForwarder apiForwarder;     // :5807  (buffered)

    private boolean running;

    public synchronized void start() {
        if (running) return;

        mjpegForwarder = new HttpForwarder(5800, LL_ADDR, 5800, /* stream */ true);
        dashForwarder  = new HttpForwarder(5801, LL_ADDR, 5801, /* stream */ false);
        wsForwarder    = new TcpForwarder (5805, LL_ADDR, 5805);
        apiForwarder   = new HttpForwarder(5807, LL_ADDR, 5807, /* stream */ false);

        try { mjpegForwarder.start(); } catch (IOException e) { logFail(5800, e); }
        try { dashForwarder.start();  } catch (IOException e) { logFail(5801, e); }
        wsForwarder.open();
        try { apiForwarder.start();   } catch (IOException e) { logFail(5807, e); }

        running = true;
        RobotLog.ii(TAG, "Limelight forwarders started");
    }

    public synchronized void stop() {
        if (!running) return;

        if (mjpegForwarder != null) mjpegForwarder.stop();
        if (dashForwarder  != null) dashForwarder.stop();
        if (wsForwarder    != null) wsForwarder.close();
        if (apiForwarder   != null) apiForwarder.stop();

        running = false;
        RobotLog.ii(TAG, "Limelight forwarders stopped");
    }

    public boolean isRunning() { return running; }

    private static void logFail(int port, IOException e) {
        RobotLog.ww(TAG, "could not bind :%d – %s", port, e.getMessage());
    }
}
