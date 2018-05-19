package com.acmerobotics.dashboard;

import android.util.Log;

import com.acmerobotics.dashboard.config.Config;
import com.acmerobotics.dashboard.config.Configuration;
import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.MessageDeserializer;
import com.acmerobotics.dashboard.message.MessageType;
import com.acmerobotics.dashboard.telemetry.TelemetryPacket;
import com.acmerobotics.dashboard.util.ClassFilter;
import com.acmerobotics.dashboard.util.ClasspathScanner;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonElement;
import com.qualcomm.robotcore.eventloop.opmode.Disabled;

import org.firstinspires.ftc.robotcore.external.Telemetry;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

public class RobotDashboard {
    public static final String TAG = "RobotDashboard";

    public static final Gson GSON = new GsonBuilder()
            .registerTypeAdapter(Message.class, new MessageDeserializer())
			.create();

	private static RobotDashboard dashboard;

	public static void start() {
	    if (dashboard != null) {
            dashboard = new RobotDashboard();
        }
	}

	public static void stop() {
	    if (dashboard != null) {
	        dashboard.close();
	        dashboard = null;
        }
    }

	public static RobotDashboard getInstance() {
		return dashboard;
	}

	private TelemetryPacket.Adapter telemetry;
	private List<RobotWebSocket> sockets;
	private RobotWebSocketServer server;
	private Configuration configuration;

	private RobotDashboard() {
		sockets = new ArrayList<>();
		configuration = new Configuration();
		telemetry = new TelemetryPacket.Adapter(this::sendTelemetryPacket);

        ClasspathScanner scanner = new ClasspathScanner(new ClassFilter() {
            @Override
            public boolean shouldProcessClass(String className) {
            	return true;
            }

            @Override
            public void processClass(Class klass) {
                if (klass.isAnnotationPresent(Config.class) && !klass.isAnnotationPresent(Disabled.class)) {
                    Log.i(TAG, String.format("Found config class %s", klass.getCanonicalName()));
                    configuration.addOptionsFromClass(klass);
                }
            }
        });
        scanner.scanClasspath();

		server = new RobotWebSocketServer(this);
		try {
			server.start();
		} catch (IOException e) {
		    Log.w(TAG, e);
		}
	}

	public void sendTelemetryPacket(TelemetryPacket telemetryPacket) {
		telemetryPacket.addTimestamp();
		sendAll(new Message(MessageType.RECEIVE_TELEMETRY, telemetryPacket));
	}

	public void updateConfig() {
	    sendAll(new Message(MessageType.RECEIVE_CONFIG, getConfigJson()));
    }

    public Telemetry getTelemetry() {
        return telemetry;
    }

    private JsonElement getConfigSchemaJson() {
	    return configuration.getJsonSchema();
    }

    private JsonElement getConfigJson() {
		return configuration.getJson();
	}

	public synchronized void sendAll(Message message) {
		for (RobotWebSocket ws : sockets) {
			ws.send(message);
		}
	}

	public synchronized void addSocket(RobotWebSocket socket) {
		sockets.add(socket);

		socket.send(new Message(MessageType.RECEIVE_CONFIG_SCHEMA, getConfigSchemaJson()));
		socket.send(new Message(MessageType.RECEIVE_CONFIG, getConfigJson()));
	}

	public synchronized void removeSocket(RobotWebSocket socket) {
		sockets.remove(socket);
	}

	public synchronized void onMessage(RobotWebSocket socket, Message msg) {
        switch(msg.getType()) {
            case GET_CONFIG: {
                socket.send(new Message(MessageType.RECEIVE_CONFIG, getConfigJson()));
                break;
            }
            case SAVE_CONFIG: {
                configuration.updateJson((JsonElement) msg.getData());
                break;
            }
            default:
                Log.w(TAG, String.format("unknown message recv'd: '%s'", msg.getType()));
                Log.w(TAG, msg.toString());
                break;
        }
    }

	private void close() {
	    server.stop();
    }
}
