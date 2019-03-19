package com.acmerobotics.dashboard;

import android.util.Log;

import com.acmerobotics.dashboard.message.Message;

import java.io.IOException;

import fi.iki.elonen.NanoHTTPD;
import fi.iki.elonen.NanoWSD;

/**
 * WebSocket connection to a dashboard client.
 */
public class DashboardWebSocket extends NanoWSD.WebSocket {
    public static final String TAG = "DashboardWebSocket";

    private static final boolean DEBUG = false;

    private FtcDashboard dashboard;

    DashboardWebSocket(NanoHTTPD.IHTTPSession handshakeRequest, FtcDashboard dash) {
        super(handshakeRequest);
        dashboard = dash;
    }

    @Override
    protected void onOpen() {
        if (DEBUG) {
            String ipAddr = getHandshakeRequest().getRemoteIpAddress();
            Log.i(TAG, "[OPEN]\t" + ipAddr);
        }
        dashboard.addSocket(this);
    }

    @Override
    protected void onClose(NanoWSD.WebSocketFrame.CloseCode code,
                           String reason, boolean initiatedByRemote) {
        if (DEBUG) {
            String ipAddr = getHandshakeRequest().getRemoteIpAddress();
            Log.i(TAG, "[CLOSE]\t" + ipAddr);
        }
        dashboard.removeSocket(this);
    }

    @Override
    protected void onMessage(NanoWSD.WebSocketFrame message) {
        String payload = message.getTextPayload();
        Message msg = dashboard.getGson().fromJson(payload, Message.class);
        if (DEBUG) {
            Log.i(TAG, "[RECV]\t" + payload);
        }
        dashboard.onMessage(this, msg);
    }

    @Override
    protected void onPong(NanoWSD.WebSocketFrame pong) {

    }

    @Override
    protected void onException(IOException exception) {
        Log.w(TAG, exception);
    }

    /**
     * Sends a message to the connected client.
     */
    public void send(Message message) {
        try {
            String messageStr = dashboard.getGson().toJson(message);
            if (DEBUG) {
                Log.i(TAG, "[SENT]\t" + messageStr);
            }
            send(messageStr);
        } catch (IOException e) {
            Log.w(TAG, e);
        }
    }

}
