package com.acmerobotics.dashboard;

import android.util.Log;

import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.MessageType;

import java.io.IOException;

import fi.iki.elonen.NanoHTTPD.IHTTPSession;
import fi.iki.elonen.NanoWSD.WebSocket;
import fi.iki.elonen.NanoWSD.WebSocketFrame;
import fi.iki.elonen.NanoWSD.WebSocketFrame.CloseCode;

public class RobotWebSocket extends WebSocket {
    public static final boolean DEBUG = false;
    
    private RobotDashboard dashboard;

    public RobotWebSocket(IHTTPSession handshakeRequest, RobotDashboard dash) {
        super(handshakeRequest);
        dashboard = dash;
    }

    @Override
    protected void onOpen() {
        if (DEBUG) Log.i(RobotDashboard.TAG, "[OPEN]\t" + this.getHandshakeRequest().getRemoteIpAddress());
        dashboard.addSocket(this);
    }

    @Override
    protected void onClose(CloseCode code, String reason, boolean initiatedByRemote) {
        if (DEBUG) Log.i(RobotDashboard.TAG, "[CLOSE]\t" + this.getHandshakeRequest().getRemoteIpAddress());
        dashboard.removeSocket(this);
    }

    @Override
    protected void onMessage(WebSocketFrame message) {
        Message msg = RobotDashboard.GSON.fromJson(message.getTextPayload(), Message.class);
        if (msg.getType() == MessageType.PING) {
            send(new Message(MessageType.PONG));
        } else {
            if (DEBUG) Log.i(RobotDashboard.TAG, "[RECV]\t" + message.getTextPayload());
            dashboard.onMessage(this, msg);
        }
    }

    @Override
    protected void onPong(WebSocketFrame pong) {
        
    }

    @Override
    protected void onException(IOException exception) {
        
    }

    public void send(Message message) {
        try {
            String messageStr = RobotDashboard.GSON.toJson(message);
            if (message.getType() != MessageType.PONG) {
                if (DEBUG) Log.i(RobotDashboard.TAG, "[SENT]\t" + messageStr);
            }
            send(messageStr);
        } catch (IOException e) {
            Log.w(RobotDashboard.TAG, e);
        }
    }
    
}