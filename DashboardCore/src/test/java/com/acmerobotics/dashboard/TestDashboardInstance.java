package com.acmerobotics.dashboard;

import com.acmerobotics.dashboard.config.ValueProvider;
import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.redux.InitOpMode;
import com.acmerobotics.dashboard.message.redux.ReceiveHardwareConfigList;
import com.acmerobotics.dashboard.message.redux.ReceiveLogcatErrors;
import com.acmerobotics.dashboard.message.redux.ReceiveLogcatLines;
import com.acmerobotics.dashboard.message.redux.ReceiveOpModeList;
import com.acmerobotics.dashboard.message.redux.ReceiveRobotStatus;
import com.acmerobotics.dashboard.message.redux.SetHardwareConfig;
import com.acmerobotics.dashboard.telemetry.TelemetryPacket;
import com.acmerobotics.dashboard.testopmode.TestOpModeManager;
import fi.iki.elonen.NanoHTTPD;
import fi.iki.elonen.NanoWSD;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;

public class TestDashboardInstance {
    private static TestDashboardInstance instance = new TestDashboardInstance();

    static final String DEFAULT_OP_MODE_NAME = "$Stop$Robot$";
    TestOpModeManager opModeManager = new TestOpModeManager();
    TestRobotConfigManager hardwareConfigManager = new TestRobotConfigManager();

    private TelemetryPacket currentPacket;

    private final Set<SendFun> logcatCaptureSockets =
            Collections.synchronizedSet(new LinkedHashSet<>());

    DashboardCore core = new DashboardCore();

    private NanoWSD server =
            new NanoWSD(8000) {
                @Override
                protected NanoWSD.WebSocket openWebSocket(NanoHTTPD.IHTTPSession handshake) {
                    return new DashWebSocket(handshake);
                }
            };

    private class DashWebSocket extends NanoWSD.WebSocket implements SendFun {
        final SocketHandler sh = core.newSocket(this);

        public DashWebSocket(NanoHTTPD.IHTTPSession handshakeRequest) {
            super(handshakeRequest);
        }

        @Override
        public void send(Message message) {
            try {
                String messageStr = DashboardCore.GSON.toJson(message);
                send(messageStr);
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        }

        @Override
        protected void onOpen() {
            sh.onOpen();

            opModeManager.setSendFun(this);

            List<OpModeInfo> opModeInfoList =
                    opModeManager.getTestOpModes().stream()
                            .map(testOpMode -> new OpModeInfo(testOpMode.getName(), "Test"))
                            .collect(Collectors.toList());

            send(new ReceiveOpModeList(opModeInfoList));

            List<HardwareConfig> hardwareConfigs = new ArrayList<>();
            List<String> configNames = hardwareConfigManager.getTestHardwareConfigs();
            List<String> configXmls = hardwareConfigManager.getActiveConfigXml();
            List<Boolean> readOnlyFlags = hardwareConfigManager.getIsReadOnly();

            for (int i = 0; i < configNames.size(); i++) {
                hardwareConfigs.add(
                        new HardwareConfig(
                                configNames.get(i), configXmls.get(i), readOnlyFlags.get(i)));
            }

            send(
                    new ReceiveHardwareConfigList(
                            hardwareConfigs, hardwareConfigManager.getActiveHardwareConfig()));
        }

        @Override
        protected void onClose(
                NanoWSD.WebSocketFrame.CloseCode code, String reason, boolean initiatedByRemote) {
            sh.onClose();

            logcatCaptureSockets.remove(this);

            opModeManager.clearSendFun();
        }

        @Override
        protected void onMessage(NanoWSD.WebSocketFrame message) {
            String payload = message.getTextPayload();
            Message msg = DashboardCore.GSON.fromJson(payload, Message.class);

            if (sh.onMessage(msg)) {
                return;
            }

            switch (msg.getType()) {
                case GET_ROBOT_STATUS:
                    {
                        String opModeName;
                        RobotStatus.OpModeStatus opModeStatus;
                        if (opModeManager.getActiveOpMode() == null) {
                            opModeName = DEFAULT_OP_MODE_NAME;
                            opModeStatus = RobotStatus.OpModeStatus.STOPPED;
                        } else {
                            opModeName = opModeManager.getActiveOpMode().getName();
                            opModeStatus = opModeManager.getActiveOpMode().getOpModeStatus();
                        }

                        send(
                                new ReceiveRobotStatus(
                                        new RobotStatus(
                                                core.enabled,
                                                true,
                                                opModeName,
                                                opModeStatus,
                                                "",
                                                "",
                                                12.0)));
                        break;
                    }
                case INIT_OP_MODE:
                    {
                        InitOpMode initOpMode = (InitOpMode) msg;
                        opModeManager.initOpMode(initOpMode.getOpModeName());
                        break;
                    }
                case START_OP_MODE:
                    opModeManager.startOpMode();
                    break;
                case STOP_OP_MODE:
                    opModeManager.stopOpMode();
                    break;
                case START_LOGCAT_CAPTURE:
                    logcatCaptureSockets.add(this);
                    break;
                case STOP_LOGCAT_CAPTURE:
                    logcatCaptureSockets.remove(this);
                    break;
                case SET_HARDWARE_CONFIG:
                    SetHardwareConfig setHardwareConfig = (SetHardwareConfig) msg;
                    hardwareConfigManager.setHardwareConfig(
                            setHardwareConfig.getHardwareConfigName());

                    // In the testing instance we must resend this data manually or things will get
                    // out of sync.
                    // In a live environment the restart will cause this data to be resent
                    // automatically.
                    List<HardwareConfig> hardwareConfigs = new ArrayList<>();
                    List<String> configNames = hardwareConfigManager.getTestHardwareConfigs();
                    List<String> configXmls = hardwareConfigManager.getActiveConfigXml();
                    List<Boolean> readOnlyFlags = hardwareConfigManager.getIsReadOnly();

                    // Combine the parallel lists into POJOs
                    for (int i = 0; i < configNames.size(); i++) {
                        hardwareConfigs.add(
                                new HardwareConfig(
                                        configNames.get(i),
                                        configXmls.get(i),
                                        readOnlyFlags.get(i)));
                    }

                    send(
                            new ReceiveHardwareConfigList(
                                    hardwareConfigs,
                                    hardwareConfigManager.getActiveHardwareConfig()));
                    break;
                default:
                    System.out.println(msg.getType());
            }
        }

        @Override
        protected void onPong(NanoWSD.WebSocketFrame pong) {}

        @Override
        protected void onException(IOException exception) {}
    }

    public static TestDashboardInstance getInstance() {
        return instance;
    }

    public void start() throws InterruptedException {
        System.out.println("Starting Dashboard instance");

        core.enabled = true;

        core.addConfigVariable(
                "Test",
                "LATERAL_MULTIPLIER",
                new ValueProvider<Double>() {
                    private double x;

                    @Override
                    public Double get() {
                        return x;
                    }

                    @Override
                    public void set(Double value) {
                        x = value;
                    }
                });
        core.addConfigVariable(
                "Test",
                "RUN_USING_ENCODER",
                new ValueProvider<Boolean>() {
                    private boolean b;

                    @Override
                    public Boolean get() {
                        return b;
                    }

                    @Override
                    public void set(Boolean value) {
                        b = value;
                    }
                });
        core.addConfigVariable(
                "Test",
                "SomeEnum",
                new ValueProvider<TestEnum>() {
                    private TestEnum te = TestEnum.Value1;

                    @Override
                    public TestEnum get() {
                        return te;
                    }

                    @Override
                    public void set(TestEnum value) {
                        te = value;
                    }
                });

        core.addConfigVariable(
                "More Primitives",
                "Long",
                new ValueProvider<Long>() {
                    private long value = 10L;

                    @Override
                    public Long get() {
                        return this.value;
                    }

                    @Override
                    public void set(Long value) {
                        this.value = value;
                    }
                });
        core.addConfigVariable(
                "More Primitives",
                "Float",
                new ValueProvider<Float>() {
                    private float value = 10L;

                    @Override
                    public Float get() {
                        return this.value;
                    }

                    @Override
                    public void set(Float value) {
                        this.value = value;
                    }
                });

        try {
            server.start();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

        startFakeLogcatEmitter();

        while (true) {
            opModeManager.loop();
            Thread.yield();
        }
    }

    // Emits fake logcat traffic so the client can be exercised without a robot: OpModeManager
    // entries on the always-on error stream, and full device log lines to whichever sockets asked
    // for a capture.
    private void startFakeLogcatEmitter() {
        Thread emitter =
                new Thread(
                        () -> {
                            String[] levels = {"INFO", "DEBUG", "WARN", "ERROR", "VERBOSE"};
                            String[] opModeMessages = {
                                "OpMode initialized",
                                "Loop time: 12ms",
                                "Battery voltage: 12.4V",
                                "IMU calibration complete",
                                "Encoder positions reset",
                                "Motor power set to 0.75",
                                "Vision pipeline latency: 33ms",
                            };
                            String[] deviceTags = {
                                "RobotCore", "LynxModule", "EventLoopManager", "ActivityManager",
                            };
                            String[] deviceMessages = {
                                "onDrawFrame: 16ms",
                                "bulk read cache invalidated",
                                "sending heartbeat",
                                "gc freed 2048K, 12% free",
                                "wifi direct group owner negotiation complete",
                            };
                            Random random = new Random();
                            int tick = 0;
                            while (true) {
                                try {
                                    Thread.sleep(250);
                                } catch (InterruptedException e) {
                                    return;
                                }

                                tick++;
                                if (tick % 4 == 0) {
                                    ReceiveLogcatErrors.LogcatError error =
                                            new ReceiveLogcatErrors.LogcatError(
                                                    System.currentTimeMillis(),
                                                    levels[random.nextInt(levels.length)],
                                                    "OpModeManager",
                                                    opModeMessages[
                                                            random.nextInt(opModeMessages.length)]);
                                    try {
                                        core.sendAll(
                                                new ReceiveLogcatErrors(
                                                        Collections.singletonList(error)));
                                    } catch (RuntimeException e) {
                                        // a socket went away between the copy and the send
                                    }
                                }

                                List<SendFun> targets;
                                synchronized (logcatCaptureSockets) {
                                    targets = new ArrayList<>(logcatCaptureSockets);
                                }
                                if (targets.isEmpty()) {
                                    continue;
                                }

                                ReceiveLogcatLines lines =
                                        new ReceiveLogcatLines(
                                                Collections.singletonList(
                                                        new ReceiveLogcatErrors.LogcatError(
                                                                System.currentTimeMillis(),
                                                                levels[
                                                                        random.nextInt(
                                                                                levels.length)],
                                                                deviceTags[
                                                                        random.nextInt(
                                                                                deviceTags.length)],
                                                                deviceMessages[
                                                                                random.nextInt(
                                                                                        deviceMessages
                                                                                                .length)]
                                                                        + " #"
                                                                        + tick)));
                                for (SendFun target : targets) {
                                    try {
                                        target.send(lines);
                                    } catch (RuntimeException e) {
                                        // the socket went away between the copy and the send
                                        logcatCaptureSockets.remove(target);
                                    }
                                }
                            }
                        },
                        "fake logcat emitter");
        emitter.setDaemon(true);
        emitter.start();
    }

    public void addData(String x, Object o) {
        if (currentPacket == null) {
            currentPacket = new TelemetryPacket();
        }

        currentPacket.put(x, o);
    }

    public void update() {
        if (currentPacket != null) {
            core.sendTelemetryPacket(currentPacket);
            currentPacket = null;
        }
    }

    public void sendTelemetryPacket(TelemetryPacket t) {
        core.sendTelemetryPacket(t);
    }
}
