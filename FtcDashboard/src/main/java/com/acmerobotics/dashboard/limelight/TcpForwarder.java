package com.acmerobotics.dashboard.limelight;

import com.qualcomm.robotcore.util.RobotLog;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketException;

/**
 * Bidirectional TCP forwarder.  Every connection accepted on {@code listenPort}
 * is paired with a new connection to {@code targetHost:targetPort} and bytes
 * are shuttled in both directions until either side closes.
 * <p>
 * This is used to make the Limelight's WebSocket (port 5805) reachable from
 * the browser through the Control Hub.
 */
class TcpForwarder {
    private static final String TAG = "dashboard:TcpFwd";

    private final int listenPort;
    private final String targetHost;
    private final int targetPort;

    private volatile boolean alive;
    private ServerSocket serverSocket;
    private Thread acceptThread;

    TcpForwarder(int listenPort, String targetHost, int targetPort) {
        this.listenPort = listenPort;
        this.targetHost = targetHost;
        this.targetPort = targetPort;
    }

    synchronized void open() {
        if (alive) return;
        alive = true;

        acceptThread = new Thread(() -> acceptLoop(), "TcpFwd-" + listenPort);
        acceptThread.setDaemon(true);
        acceptThread.start();
    }

    synchronized void close() {
        if (!alive) return;
        alive = false;

        try {
            if (serverSocket != null) serverSocket.close();
        } catch (IOException ignored) { }

        if (acceptThread != null) {
            acceptThread.interrupt();
        }
    }

    /* ---- internals ---- */

    private void acceptLoop() {
        try {
            serverSocket = new ServerSocket(listenPort);
            RobotLog.ii(TAG, "listening on :%d → %s:%d", listenPort, targetHost, targetPort);

            while (alive) {
                Socket client = serverSocket.accept();
                Thread t = new Thread(() -> bridge(client), "TcpBridge-" + listenPort);
                t.setDaemon(true);
                t.start();
            }
        } catch (SocketException e) {
            if (alive) RobotLog.ww(TAG, "accept error on :%d: %s", listenPort, e.getMessage());
        } catch (IOException e) {
            RobotLog.ee(TAG, "server socket error on :%d: %s", listenPort, e.getMessage());
        }
    }

    /**
     * Connects to the target and copies bytes in both directions until either
     * side disconnects.
     */
    private void bridge(Socket client) {
        try (Socket remote = new Socket(targetHost, targetPort)) {
            Thread toRemote = copyAsync(client.getInputStream(), remote.getOutputStream(),
                    "c→r:" + listenPort);
            Thread toClient = copyAsync(remote.getInputStream(), client.getOutputStream(),
                    "r→c:" + listenPort);

            // Wait for either direction to finish (= connection closed by one side)
            toRemote.join();
            toClient.join();
        } catch (IOException | InterruptedException e) {
            // Typical when one side drops the connection – no action needed.
        } finally {
            try { client.close(); } catch (IOException ignored) { }
        }
    }

    private static Thread copyAsync(InputStream in, OutputStream out, String name) {
        Thread t = new Thread(() -> {
            byte[] buf = new byte[8192];
            try {
                int n;
                while ((n = in.read(buf)) >= 0) {
                    out.write(buf, 0, n);
                    out.flush();
                }
            } catch (IOException ignored) { }
        }, name);
        t.setDaemon(true);
        t.start();
        return t;
    }
}
