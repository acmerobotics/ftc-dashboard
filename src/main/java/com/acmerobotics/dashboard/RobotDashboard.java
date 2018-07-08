package com.acmerobotics.dashboard;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;

import com.acmerobotics.dashboard.config.Config;
import com.acmerobotics.dashboard.config.Configuration;
import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.MessageType;
import com.acmerobotics.dashboard.telemetry.TelemetryPacket;
import com.acmerobotics.dashboard.util.ClassFilter;
import com.acmerobotics.dashboard.util.ClasspathScanner;
import com.google.gson.JsonElement;
import com.google.gson.JsonPrimitive;
import com.qualcomm.robotcore.eventloop.EventLoop;
import com.qualcomm.robotcore.eventloop.opmode.Disabled;
import com.qualcomm.robotcore.eventloop.opmode.OpMode;

import org.firstinspires.ftc.robotcore.external.Consumer;
import org.firstinspires.ftc.robotcore.external.Telemetry;
import org.firstinspires.ftc.robotcore.internal.opmode.OpModeManagerImpl;
import org.firstinspires.ftc.robotcore.internal.opmode.OpModeMeta;
import org.firstinspires.ftc.robotcore.internal.opmode.RegisteredOpModes;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Main class for interacting with the dashboard.
 */
public class RobotDashboard implements OpModeManagerImpl.Notifications {
    public static final String TAG = "RobotDashboard";

    private static final Set<String> IGNORED_PACKAGES = new HashSet<>(Arrays.asList(
            "java",
            "android",
            "com.sun",
            "com.vuforia",
            "com.google",
            "kotlin"
    ));

	private static RobotDashboard dashboard;

    /**
     * Starts the dashboard and a WebSocket server that listens for external connections.
     * This method should usually be called from {@link Activity#onCreate(Bundle)}.
     */
	public static void start() {
        if (dashboard == null) {
            dashboard = new RobotDashboard();
        }
    }

    /**
     * Attaches the event loop to the dashboard for op mode management.
     * @param eventLoop
     */
    public static void attachEventLoop(EventLoop eventLoop) {
	    dashboard.internalAttachEventLoop(eventLoop);
    }

    /**
     * Stops the dashboard and the underlying WebSocket server. This method should usually be
     * called from {@link Activity#onDestroy()}.
     */
	public static void stop() {
	    if (dashboard != null) {
	        dashboard.close();
	        dashboard = null;
        }
    }

    /**
     * Returns the active dashboard instance. This should be called after {@link #start()}.
     * @return active dashboard instance or null outside of its lifecycle
     */
	public static RobotDashboard getInstance() {
		return dashboard;
	}

	private TelemetryPacket.Adapter telemetry;
	private List<RobotWebSocket> sockets;
	private RobotWebSocketServer server;
	private Configuration configuration;
	private OpModeManagerImpl opModeManager;
	private RobotStatus.OpModeStatus activeOpModeStatus = RobotStatus.OpModeStatus.STOPPED;
	private List<String> opModeList;

	private RobotDashboard() {
		sockets = new ArrayList<>();
		configuration = new Configuration();
		telemetry = new TelemetryPacket.Adapter(new Consumer<TelemetryPacket>() {
			@Override
			public void accept(TelemetryPacket telemetryPacket) {
				sendTelemetryPacket(telemetryPacket);
			}
		});

        ClasspathScanner scanner = new ClasspathScanner(new ClassFilter() {
            @Override
            public boolean shouldProcessClass(String className) {
            	for (String packageName : IGNORED_PACKAGES) {
            	    if (className.startsWith(packageName)) {
            	        return false;
                    }
                }
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

		opModeList = new ArrayList<>();
	}

	private void internalAttachEventLoop(EventLoop eventLoop) {
        opModeManager = eventLoop.getOpModeManager();
        if (opModeManager != null) {
            opModeManager.registerListener(this);
        }

        synchronized (opModeList) {
            opModeList.clear();
        }

        (new Thread() {
            @Override
            public void run() {
                RegisteredOpModes.getInstance().waitOpModesRegistered();
                synchronized (opModeList) {
                    for (OpModeMeta opModeMeta : RegisteredOpModes.getInstance().getOpModes()) {
                        opModeList.add(opModeMeta.name);
                    }
                    sendAll(new Message(MessageType.RECEIVE_OP_MODE_LIST, opModeList));
                }
            }
        }).start();
    }

    /**
     * Sends telemetry information to all dashboard clients.
     * @param telemetryPacket packet to send
     */
	public void sendTelemetryPacket(TelemetryPacket telemetryPacket) {
		telemetryPacket.addTimestamp();
		sendAll(new Message(MessageType.RECEIVE_TELEMETRY, telemetryPacket));
	}

    /**
     * Sends updated configuration data to all dashboard clients.
     */
	public void updateConfig() {
	    sendAll(new Message(MessageType.RECEIVE_CONFIG_OPTIONS, getConfigJson()));
    }

    /**
     * Returns a telemetry object that proxies {@link #sendTelemetryPacket(TelemetryPacket)}.
     */
    public Telemetry getTelemetry() {
        return telemetry;
    }

    private JsonElement getConfigSchemaJson() {
	    return configuration.getJsonSchema();
    }

    private JsonElement getConfigJson() {
		return configuration.getJson();
	}

	private RobotStatus getRobotStatus() {
        if (opModeManager == null) {
            return new RobotStatus();
        } else {
            return new RobotStatus(opModeManager.getActiveOpModeName(), activeOpModeStatus);
        }
    }

	private synchronized void sendAll(Message message) {
		for (RobotWebSocket ws : sockets) {
			ws.send(message);
		}
	}

	synchronized void addSocket(RobotWebSocket socket) {
		sockets.add(socket);

		socket.send(new Message(MessageType.RECEIVE_CONFIG_SCHEMA, getConfigSchemaJson()));
		socket.send(new Message(MessageType.RECEIVE_CONFIG_OPTIONS, getConfigJson()));
		synchronized (opModeList) {
            if (opModeList.size() > 0) {
                socket.send(new Message(MessageType.RECEIVE_OP_MODE_LIST, opModeList));
            }
        }
	}

	synchronized void removeSocket(RobotWebSocket socket) {
		sockets.remove(socket);
	}

	synchronized void onMessage(RobotWebSocket socket, Message msg) {
        switch(msg.getType()) {
            case GET_ROBOT_STATUS: {
                socket.send(new Message(MessageType.RECEIVE_ROBOT_STATUS, getRobotStatus()));
                break;
            }
            case GET_CONFIG_OPTIONS: {
                socket.send(new Message(MessageType.RECEIVE_CONFIG_OPTIONS, getConfigJson()));
                break;
            }
            case INIT_OP_MODE: {
                String opModeName = ((JsonPrimitive) msg.getData()).getAsString();
                opModeManager.initActiveOpMode(opModeName);
                break;
            }
            case START_OP_MODE: {
                opModeManager.startActiveOpMode();
                break;
            }
            case STOP_OP_MODE: {
                opModeManager.stopActiveOpMode();
                break;
            }
            case SAVE_CONFIG_OPTIONS: {
                configuration.updateJson((JsonElement) msg.getData());
                updateConfig();
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

    @Override
    public void onOpModePreInit(OpMode opMode) {
        activeOpModeStatus = RobotStatus.OpModeStatus.INIT;
    }

    @Override
    public void onOpModePreStart(OpMode opMode) {
        activeOpModeStatus = RobotStatus.OpModeStatus.RUNNING;
    }

    @Override
    public void onOpModePostStop(OpMode opMode) {
        activeOpModeStatus = RobotStatus.OpModeStatus.STOPPED;
    }
}
