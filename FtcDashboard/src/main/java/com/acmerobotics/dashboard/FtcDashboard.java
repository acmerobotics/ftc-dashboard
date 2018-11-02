package com.acmerobotics.dashboard;

import android.app.Activity;
import android.content.res.AssetManager;
import android.graphics.Bitmap;
import android.os.Bundle;
import android.util.Base64;
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
import com.qualcomm.robotcore.util.ThreadPool;

import org.firstinspires.ftc.robotcore.external.Telemetry;
import org.firstinspires.ftc.robotcore.internal.opmode.OpModeManagerImpl;
import org.firstinspires.ftc.robotcore.internal.opmode.OpModeMeta;
import org.firstinspires.ftc.robotcore.internal.opmode.RegisteredOpModes;
import org.firstinspires.ftc.robotcore.internal.system.AppUtil;
import org.firstinspires.ftc.robotcore.internal.webserver.MimeTypesUtil;
import org.firstinspires.ftc.robotcore.internal.webserver.WebHandler;
import org.firstinspires.ftc.robotcore.internal.webserver.WebHandlerManager;
import org.firstinspires.ftc.robotcore.internal.webserver.WebServer;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import fi.iki.elonen.NanoHTTPD;

/**
 * Main class for interacting with the instance.
 */
public class FtcDashboard implements OpModeManagerImpl.Notifications {
    public static final String TAG = "FtcDashboard";

    private static final Set<String> IGNORED_PACKAGES = new HashSet<>(Arrays.asList(
            "java",
            "android",
            "com.sun",
            "com.vuforia",
            "com.google",
            "kotlin"
    ));

	private static FtcDashboard instance;

    /**
     * Starts the instance and a WebSocket server that listens for external connections.
     * This method should usually be called from {@link Activity#onCreate(Bundle)}.
     */
	public static void start() {
        if (instance == null) {
            instance = new FtcDashboard();
        }
    }

    /**
     * Attaches a web server for accessing the dashboard through the phone (like OBJ/Blocks).
     * @param webServer web server
     */
    public static void attachWebServer(WebServer webServer) {
	    instance.internalAttachWebServer(webServer);
    }

    /**
     * Attaches the event loop to the instance for op mode management.
     * @param eventLoop event loop
     */
    public static void attachEventLoop(EventLoop eventLoop) {
	    instance.internalAttachEventLoop(eventLoop);
    }

    /**
     * Stops the instance and the underlying WebSocket server. This method should usually be
     * called from {@link Activity#onDestroy()}.
     */
	public static void stop() {
	    if (instance != null) {
	        instance.close();
	        instance = null;
        }
    }

    /**
     * Returns the active instance instance. This should be called after {@link #start()}.
     * @return active instance instance or null outside of its lifecycle
     */
	public static FtcDashboard getInstance() {
		return instance;
	}

	private TelemetryPacket.Adapter telemetry;
	private List<DashboardWebSocket> sockets;
	private DashboardWebSocketServer server;
	private Configuration configuration;
	private OpModeManagerImpl opModeManager;
	private RobotStatus.OpModeStatus activeOpModeStatus = RobotStatus.OpModeStatus.STOPPED;
    private AssetManager assetManager;
    private final List<String> opModeList;
	private List<String> assetFiles;
	private int imageQuality = 50;

	private int telemetryTransmissionInterval = 100;
	private ExecutorService telemetryExecutorService;
	private volatile TelemetryPacket nextTelemetryPacket;
	private final Object telemetryLock = new Object();

	private class TelemetryUpdateRunnable implements Runnable {
        @Override
        public void run() {
            while (!Thread.currentThread().isInterrupted()) {
                while (nextTelemetryPacket == null) {
                    try {
                        Thread.sleep(1);
                    } catch (InterruptedException e) {
                        break;
                    }
                }
                long startTime = System.currentTimeMillis();
                synchronized (telemetryLock) {
                    if (nextTelemetryPacket != null) {
                        sendAll(new Message(MessageType.RECEIVE_TELEMETRY, nextTelemetryPacket));
                        nextTelemetryPacket = null;
                    } else {
                        continue;
                    }
                }
                long sleepTime = startTime + telemetryTransmissionInterval - System.currentTimeMillis();
                if (sleepTime > 0) {
                    try {
                        Thread.sleep(sleepTime);
                    } catch (InterruptedException e) {
                        break;
                    }
                }
            }
        }
    }

    private FtcDashboard() {
        sockets = new ArrayList<>();
        configuration = new Configuration();
        telemetry = new TelemetryPacket.Adapter(this);

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
                    configuration.addOptionsFromClass(klass);
                }
            }
        });
        scanner.scanClasspath();

        server = new DashboardWebSocketServer(this);
        try {
            server.start();
        } catch (IOException e) {
            Log.w(TAG, e);
        }

        assetManager = AppUtil.getDefContext().getAssets();

        opModeList = new ArrayList<>();

        assetFiles = new ArrayList<>();
        buildAssetsFileList("dash");

        telemetryExecutorService = ThreadPool.newSingleThreadExecutor("dash telemetry");
        telemetryExecutorService.submit(new TelemetryUpdateRunnable());
    }

    private WebHandler newStaticAssetHandler(final String file) {
	    return new WebHandler() {
            @Override
            public NanoHTTPD.Response getResponse(NanoHTTPD.IHTTPSession session) throws IOException {
                if (session.getMethod() == NanoHTTPD.Method.GET) {
                    String mimeType = MimeTypesUtil.determineMimeType(file);
                    return NanoHTTPD.newChunkedResponse(NanoHTTPD.Response.Status.OK, mimeType, assetManager.open(file));
                } else {
                    return NanoHTTPD.newFixedLengthResponse(NanoHTTPD.Response.Status.NOT_FOUND, NanoHTTPD.MIME_PLAINTEXT, "");
                }
            }
        };
    }

    private boolean buildAssetsFileList(String path) {
        try {
            String[] list = assetManager.list(path);
            if (list == null) return false;
            if (list.length > 0) {
                for (String file : list) {
                    if (!buildAssetsFileList(path + "/" + file))
                        return false;
                }
            } else {
                assetFiles.add(path);
            }
        } catch (IOException e) {
            return false;
        }

        return true;
    }

    private void internalAttachWebServer(WebServer webServer) {
        WebHandlerManager manager = webServer.getWebHandlerManager();
        manager.register("/dash", newStaticAssetHandler("dash/index.html"));
        for (final String file : assetFiles) {
            manager.register("/" + file, newStaticAssetHandler(file));
        }
    }

    private void internalAttachEventLoop(EventLoop eventLoop) {
	    // this could be called multiple times within the lifecycle of the dashboard
        if (opModeManager != null) {
            opModeManager.unregisterListener(this);
        }

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
     * Sends telemetry information to all instance clients.
     * @param telemetryPacket packet to send
     */
	public void sendTelemetryPacket(TelemetryPacket telemetryPacket) {
		telemetryPacket.addTimestamp();
		synchronized (telemetryLock) {
            nextTelemetryPacket = telemetryPacket;
        }
	}

    /**
     * Returns the telemetry transmission interval in milliseconds.
     */
	public int getTelemetryTransmissionInterval() {
	    return telemetryTransmissionInterval;
    }

    /**
     * Sets the telemetry transmission interval.
     * @param newTransmissionInterval transmission interval in milliseconds
     */
    public void setTelemetryTransmissionInterval(int newTransmissionInterval) {
	    telemetryTransmissionInterval = newTransmissionInterval;
    }

    /**
     * Sends updated configuration data to all instance clients.
     */
	public void updateConfig() {
	    sendAll(new Message(MessageType.RECEIVE_CONFIG_OPTIONS, getConfigJson()));
    }

    /**
     * Sends an image to the dashboard for display (MJPEG style). Note that that encoding process is
     * synchronous.
     * @param bitmap bitmap to send
     */
    public void sendImage(Bitmap bitmap) {
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.JPEG, imageQuality, outputStream);
        String imageStr = Base64.encodeToString(outputStream.toByteArray(), Base64.DEFAULT);
        sendAll(new Message(MessageType.RECEIVE_IMAGE, imageStr));
    }

    /**
     * Returns the image quality used by {@link #sendImage(Bitmap)}
     */
    public int getImageQuality() {
        return imageQuality;
    }

    /**
     * Sets the image quality used by {@link #sendImage(Bitmap)}
     */
    public void setImageQuality(int quality) {
        imageQuality = quality;
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
		for (DashboardWebSocket ws : sockets) {
			ws.send(message);
		}
	}

	synchronized void addSocket(DashboardWebSocket socket) {
		sockets.add(socket);

		socket.send(new Message(MessageType.RECEIVE_CONFIG_SCHEMA, getConfigSchemaJson()));
		socket.send(new Message(MessageType.RECEIVE_CONFIG_OPTIONS, getConfigJson()));
		synchronized (opModeList) {
            if (opModeList.size() > 0) {
                socket.send(new Message(MessageType.RECEIVE_OP_MODE_LIST, opModeList));
            }
        }
	}

	synchronized void removeSocket(DashboardWebSocket socket) {
		sockets.remove(socket);
	}

	synchronized void onMessage(DashboardWebSocket socket, Message msg) {
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
        if (opModeManager != null) {
            opModeManager.unregisterListener(this);
        }
        telemetryExecutorService.shutdownNow();
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
