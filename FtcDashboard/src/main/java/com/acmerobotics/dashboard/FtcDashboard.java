package com.acmerobotics.dashboard;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.res.AssetManager;
import android.graphics.Bitmap;
import android.graphics.Typeface;
import android.util.Base64;
import android.util.Log;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.acmerobotics.dashboard.config.reflection.ReflectionConfig;
import com.acmerobotics.dashboard.config.variable.BasicVariable;
import com.acmerobotics.dashboard.config.variable.ConfigVariableDeserializer;
import com.acmerobotics.dashboard.config.variable.ConfigVariableSerializer;
import com.acmerobotics.dashboard.config.variable.CustomVariable;
import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.MessageDeserializer;
import com.acmerobotics.dashboard.message.redux.InitOpMode;
import com.acmerobotics.dashboard.message.redux.ReceiveConfig;
import com.acmerobotics.dashboard.message.redux.ReceiveGamepadState;
import com.acmerobotics.dashboard.message.redux.ReceiveImage;
import com.acmerobotics.dashboard.message.redux.ReceiveOpModeList;
import com.acmerobotics.dashboard.message.redux.ReceiveRobotStatus;
import com.acmerobotics.dashboard.message.redux.ReceiveTelemetry;
import com.acmerobotics.dashboard.message.redux.SaveConfig;
import com.acmerobotics.dashboard.telemetry.TelemetryPacket;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonSyntaxException;
import com.qualcomm.robotcore.eventloop.EventLoop;
import com.qualcomm.robotcore.eventloop.opmode.OpMode;
import com.qualcomm.robotcore.exception.RobotCoreException;
import com.qualcomm.robotcore.hardware.Gamepad;
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
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;

import fi.iki.elonen.NanoHTTPD;

/**
 * Main class for interacting with the instance.
 */
public class FtcDashboard implements OpModeManagerImpl.Notifications {
    private static final String TAG = "FtcDashboard";

    private static final int DEFAULT_TELEMETRY_TRANSMISSION_INTERVAL = 50; // ms
    private static final int DEFAULT_IMAGE_QUALITY = 50; // 0-100

    // TODO: make this configurable?
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
     * Stops the instance and the underlying WebSocket server.
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

    private DashboardWebSocketServer server;
    private List<DashboardWebSocket> sockets = new ArrayList<>();

    private TelemetryPacket.Adapter telemetry;
    private ExecutorService telemetryExecutorService;
    private volatile TelemetryPacket nextTelemetryPacket;
    private final Object telemetryLock = new Object();
    private int telemetryTransmissionInterval = DEFAULT_TELEMETRY_TRANSMISSION_INTERVAL;

    private CustomVariable configRoot;

    private int imageQuality = DEFAULT_IMAGE_QUALITY;

    private OpModeManagerImpl opModeManager;
    private OpMode activeOpMode;
    private RobotStatus.OpModeStatus activeOpModeStatus = RobotStatus.OpModeStatus.STOPPED;
    private final List<String> opModeList = new ArrayList<>();
    private final Object opModeLock = new Object();

    private TextView connectionStatusTextView;
    private LinearLayout parentLayout;

    private Gson gson;

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
                        sendAll(new ReceiveTelemetry(nextTelemetryPacket));
                        nextTelemetryPacket = null;
                    } else {
                        continue;
                    }
                }
                long elapsedTime = System.currentTimeMillis() - startTime;
                long sleepTime = telemetryTransmissionInterval - elapsedTime;
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

    private class ListOpModesRunnable implements Runnable {
        @Override
        public void run() {
            RegisteredOpModes.getInstance().waitOpModesRegistered();
            synchronized (opModeList) {
                for (OpModeMeta opModeMeta : RegisteredOpModes.getInstance().getOpModes()) {
                    opModeList.add(opModeMeta.name);
                }
                Collections.sort(opModeList);
                sendAll(new ReceiveOpModeList(opModeList));
            }
        }
    }

    private FtcDashboard() {
        telemetry = new TelemetryPacket.Adapter(this);

        gson = new GsonBuilder()
                .registerTypeAdapter(Message.class, new MessageDeserializer())
                .registerTypeAdapter(BasicVariable.class, new ConfigVariableSerializer())
                .registerTypeAdapter(BasicVariable.class, new ConfigVariableDeserializer())
                .registerTypeAdapter(CustomVariable.class, new ConfigVariableSerializer())
                .registerTypeAdapter(CustomVariable.class, new ConfigVariableDeserializer())
                .create();

        configRoot = ReflectionConfig.scanForClasses(IGNORED_PACKAGES);

        server = new DashboardWebSocketServer(this);
        try {
            server.start();
        } catch (IOException e) {
            Log.w(TAG, e);
        }

        telemetryExecutorService = ThreadPool.newSingleThreadExecutor("dash telemetry");
        telemetryExecutorService.submit(new TelemetryUpdateRunnable());

        injectStatusView();
    }

    private void injectStatusView() {
        Activity activity = AppUtil.getInstance().getActivity();

        if (activity == null) return;

        connectionStatusTextView = new TextView(activity);
        connectionStatusTextView.setTypeface(Typeface.DEFAULT_BOLD);
        int color = activity.getResources().getColor(R.color.dashboardColor);
        connectionStatusTextView.setTextColor(color);
        int horizontalMarginId = activity.getResources().getIdentifier(
                "activity_horizontal_margin", "dimen", activity.getPackageName());
        int horizontalMargin = (int) activity.getResources().getDimension(horizontalMarginId);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        params.setMargins(horizontalMargin, 0, horizontalMargin, 0);
        connectionStatusTextView.setLayoutParams(params);

        int parentLayoutId = activity.getResources().getIdentifier(
                "entire_screen", "id", activity.getPackageName());
        parentLayout = activity.findViewById(parentLayoutId);
        int childCount = parentLayout.getChildCount();
        int relativeLayoutId = activity.getResources().getIdentifier(
                "RelativeLayout", "id", activity.getPackageName());
        int i;
        for (i = 0; i < childCount; i++) {
            if (parentLayout.getChildAt(i).getId() == relativeLayoutId) {
                break;
            }
        }
        final int relativeLayoutIndex = i;
        AppUtil.getInstance().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                parentLayout.addView(connectionStatusTextView, relativeLayoutIndex);
            }
        });

        updateStatusView();
    }

    private void removeStatusView() {
        if (parentLayout != null && connectionStatusTextView != null) {
            AppUtil.getInstance().runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    parentLayout.removeView(connectionStatusTextView);
                }
            });
        }
    }

    private synchronized void updateStatusView() {
        if (connectionStatusTextView != null) {
            AppUtil.getInstance().runOnUiThread(new Runnable() {
                @SuppressLint("SetTextI18n")
                @Override
                public void run() {
                    int connections = sockets.size();
                    if (connections == 0) {
                        connectionStatusTextView.setText("Dashboard: no connections");
                    } else if (connections == 1) {
                        connectionStatusTextView.setText("Dashboard: 1 connection");
                    } else {
                        connectionStatusTextView.setText("Dashboard: " + connections + " connections");
                    }
                }
            });
        }
    }

    private WebHandler newStaticAssetHandler(final AssetManager assetManager, final String file) {
        return new WebHandler() {
            @Override
            public NanoHTTPD.Response getResponse(NanoHTTPD.IHTTPSession session)
                    throws IOException {
                if (session.getMethod() == NanoHTTPD.Method.GET) {
                    String mimeType = MimeTypesUtil.determineMimeType(file);
                    return NanoHTTPD.newChunkedResponse(NanoHTTPD.Response.Status.OK,
                            mimeType, assetManager.open(file));
                } else {
                    return NanoHTTPD.newFixedLengthResponse(NanoHTTPD.Response.Status.NOT_FOUND,
                            NanoHTTPD.MIME_PLAINTEXT, "");
                }
            }
        };
    }

    private void addAssetWebHandlers(WebHandlerManager webHandlerManager,
                                     AssetManager assetManager, String path) {
        try {
            String[] list = assetManager.list(path);

            if (list == null) return;

            if (list.length > 0) {
                for (String file : list) {
                    addAssetWebHandlers(webHandlerManager, assetManager, path + "/" + file);
                }
            } else {
                webHandlerManager.register("/" + path,
                        newStaticAssetHandler(assetManager, path));
            }
        } catch (IOException e) {
            Log.w(TAG, e);
        }
    }

    private void internalAttachWebServer(WebServer webServer) {
        Activity activity = AppUtil.getInstance().getActivity();

        if (activity == null) return;

        WebHandlerManager webHandlerManager = webServer.getWebHandlerManager();
        AssetManager assetManager = activity.getAssets();
        webHandlerManager.register("/dash",
                newStaticAssetHandler(assetManager, "dash/index.html"));
        webHandlerManager.register("/dash/",
                newStaticAssetHandler(assetManager, "dash/index.html"));
        addAssetWebHandlers(webHandlerManager, assetManager, "dash");
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

        Thread t = new Thread(new ListOpModesRunnable());
        t.start();
    }

    public <T> T fromJson(String json, Class<T> classOfT) throws JsonSyntaxException {
        return gson.fromJson(json, classOfT);
    }

    public String toJson(Object src) {
        return gson.toJson(src);
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
     * Returns a telemetry object that proxies {@link #sendTelemetryPacket(TelemetryPacket)}.
     */
    public Telemetry getTelemetry() {
        return telemetry;
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
        sendAll(new ReceiveConfig(configRoot));
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
        sendAll(new ReceiveImage(imageStr));
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

    private void updateGamepads(Gamepad gamepad1, Gamepad gamepad2) {
        synchronized (opModeLock) {
            // for now, the dashboard only overrides synthetic gamepads
            if (activeOpModeStatus == RobotStatus.OpModeStatus.STOPPED) {
                return;
            }
            if (activeOpMode.gamepad1.getGamepadId() != Gamepad.ID_UNASSOCIATED ||
                    activeOpMode.gamepad2.getGamepadId() != Gamepad.ID_UNASSOCIATED) {
                return;
            }

            try {
                activeOpMode.gamepad1.copy(gamepad1);
                activeOpMode.gamepad2.copy(gamepad2);
            } catch (RobotCoreException e) {
                Log.w(TAG, e);
            }
        }
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

        socket.send(new ReceiveConfig(configRoot));
        synchronized (opModeList) {
            if (opModeList.size() > 0) {
                socket.send(new ReceiveOpModeList(opModeList));
            }
        }

        updateStatusView();
    }

    synchronized void removeSocket(DashboardWebSocket socket) {
        sockets.remove(socket);

        updateStatusView();
    }

    synchronized void onMessage(DashboardWebSocket socket, Message msg) {
        switch (msg.getType()) {
            case GET_ROBOT_STATUS: {
                socket.send(new ReceiveRobotStatus(getRobotStatus()));
                break;
            }
            case GET_CONFIG: {
                socket.send(new ReceiveConfig(configRoot));
                break;
            }
            case INIT_OP_MODE: {
                String opModeName = ((InitOpMode) msg).getOpModeName();
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
            case SAVE_CONFIG: {
                configRoot.update(((SaveConfig) msg).getConfigDiff());
                updateConfig();
                break;
            }
            case RECEIVE_GAMEPAD_STATE: {
                ReceiveGamepadState castMsg = (ReceiveGamepadState) msg;
                updateGamepads(castMsg.getGamepad1(), castMsg.getGamepad2());
                break;
            }
            default:
                Log.w(TAG, "Received unknown message of type " + msg.getType());
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

        removeStatusView();
    }

    @Override
    public void onOpModePreInit(OpMode opMode) {
        synchronized (opModeLock) {
            activeOpModeStatus = RobotStatus.OpModeStatus.INIT;
            activeOpMode = opMode;
        }
    }

    @Override
    public void onOpModePreStart(OpMode opMode) {
        synchronized (opModeLock) {
            activeOpModeStatus = RobotStatus.OpModeStatus.RUNNING;
            activeOpMode = opMode;
        }
    }

    @Override
    public void onOpModePostStop(OpMode opMode) {
        synchronized (opModeLock) {
            activeOpModeStatus = RobotStatus.OpModeStatus.STOPPED;
            activeOpMode = opMode;
        }
    }
}
