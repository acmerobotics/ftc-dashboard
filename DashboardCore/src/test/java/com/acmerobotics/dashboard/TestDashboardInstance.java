package com.acmerobotics.dashboard;

import com.acmerobotics.dashboard.config.ValueProvider;
import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.redux.InitOpMode;
import com.acmerobotics.dashboard.message.redux.ReceiveHardwareConfigList;
import com.acmerobotics.dashboard.message.redux.ReceiveOpModeList;
import com.acmerobotics.dashboard.message.redux.ReceiveRobotStatus;
import com.acmerobotics.dashboard.message.redux.SetHardwareConfig;
import com.acmerobotics.dashboard.OpModeInfo;
import com.acmerobotics.dashboard.telemetry.TelemetryPacket;
import com.acmerobotics.dashboard.testopmode.TestOpModeManager;
import fi.iki.elonen.NanoHTTPD;
import fi.iki.elonen.NanoWSD;
import java.io.IOException;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

enum TestEnum {
    Value1,
    Value2,
    Value3
};

public class TestDashboardInstance {
    private static TestDashboardInstance instance = new TestDashboardInstance();

    final String DEFAULT_OP_MODE_NAME = "$Stop$Robot$";
    TestOpModeManager opModeManager = new TestOpModeManager();
    TestRobotConfigManager hardwareConfigManager = new TestRobotConfigManager();

    private TelemetryPacket currentPacket;

    DashboardCore core = new DashboardCore();

    private final File LOG_ROOT = new File(System.getProperty("java.io.tmpdir"), "FTCDashboard/testlogs");

    private NanoWSD server = new NanoWSD(8000) {
        @Override
        protected NanoWSD.WebSocket openWebSocket(NanoHTTPD.IHTTPSession handshake) {
            return new DashWebSocket(handshake);
        }

        @Override
        public NanoHTTPD.Response serve(NanoHTTPD.IHTTPSession session) {
            String uri = session.getUri();
            if ("/dash/logs/list".equals(uri)) {
                File[] files = LOG_ROOT.listFiles(pathname -> pathname.isFile() && pathname.getName().endsWith(".log"));
                if (files == null) files = new File[0];
                // sort by last modified desc
                java.util.Arrays.sort(files, (a, b) -> Long.compare(b.lastModified(), a.lastModified()));
                StringBuilder sb = new StringBuilder();
                sb.append('[');
                for (int i = 0; i < files.length; i++) {
                    File f = files[i];
                    String nameEsc = f.getName().replace("\\", "\\\\").replace("\"", "\\\"");
                    if (i > 0) sb.append(',');
                    sb.append("{\"name\":\"").append(nameEsc).append("\",")
                      .append("\"size\":").append(f.length()).append(',')
                      .append("\"lastModified\":").append(f.lastModified()).append('}');
                }
                sb.append(']');
                NanoHTTPD.Response resp = NanoHTTPD.newFixedLengthResponse(NanoHTTPD.Response.Status.OK, "application/json", sb.toString());
                resp.addHeader("Cache-Control", "no-store");
                return resp;
            } else if ("/dash/logs/download".equals(uri)) {
                java.util.Map<String, java.util.List<String>> params = session.getParameters();
                java.util.List<String> names = params.get("file");
                if (names == null || names.isEmpty()) {
                    return NanoHTTPD.newFixedLengthResponse(NanoHTTPD.Response.Status.BAD_REQUEST, "text/plain", "missing 'file' parameter");
                }
                String requested = names.get(0);
                if (requested.contains("/") || requested.contains("\\") || !requested.endsWith(".log")) {
                    return NanoHTTPD.newFixedLengthResponse(NanoHTTPD.Response.Status.FORBIDDEN, "text/plain", "invalid file name");
                }
                File file = new File(LOG_ROOT, requested);
                if (!file.exists() || !file.isFile()) {
                    return NanoHTTPD.newFixedLengthResponse(NanoHTTPD.Response.Status.NOT_FOUND, "text/plain", "file not found");
                }
                try {
                    FileInputStream fis = new FileInputStream(file);
                    NanoHTTPD.Response resp = NanoHTTPD.newChunkedResponse(NanoHTTPD.Response.Status.OK, "application/octet-stream", fis);
                    String encoded = URLEncoder.encode(file.getName(), StandardCharsets.UTF_8.name());
                    resp.addHeader("Content-Disposition", "attachment; filename=\"" + encoded + "\"");
                    resp.addHeader("Cache-Control", "no-store");
                    return resp;
                } catch (Exception e) {
                    return NanoHTTPD.newFixedLengthResponse(NanoHTTPD.Response.Status.INTERNAL_ERROR, "text/plain", e.toString());
                }
            }
            return super.serve(session);
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
            
            List<OpModeInfo> opModeInfoList = opModeManager
                .getTestOpModes()
                .stream().map(testOpMode -> new OpModeInfo(testOpMode.getName(), "Test"))
                .collect(Collectors.toList());
            
            send(new ReceiveOpModeList(opModeInfoList));
            send(new ReceiveHardwareConfigList(
                hardwareConfigManager.getTestHardwareConfigs(),
                hardwareConfigManager.getActiveHardwareConfig()
            ));
        }

        @Override
        protected void onClose(NanoWSD.WebSocketFrame.CloseCode code, String reason,
                               boolean initiatedByRemote) {
            sh.onClose();

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
                case GET_ROBOT_STATUS: {
                    String opModeName;
                    RobotStatus.OpModeStatus opModeStatus;
                    if (opModeManager.getActiveOpMode() == null) {
                        opModeName = DEFAULT_OP_MODE_NAME;
                        opModeStatus = RobotStatus.OpModeStatus.STOPPED;
                    } else {
                        opModeName = opModeManager.getActiveOpMode().getName();
                        opModeStatus = opModeManager.getActiveOpMode().getOpModeStatus();
                    }

                    send(new ReceiveRobotStatus(
                        new RobotStatus(core.enabled, true, opModeName, opModeStatus, "", "", 12.0)
                    ));
                    break;
                }
                case INIT_OP_MODE: {
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
                case SET_HARDWARE_CONFIG:
                    SetHardwareConfig setHardwareConfig = (SetHardwareConfig) msg;
                    hardwareConfigManager.setHardwareConfig(setHardwareConfig.getHardwareConfigName());

                    // In the testing instance we must resend this data manually or things will get out of sync.
                    // In a live environment the restart will cause this data to be resent automatically.
                    send(new ReceiveHardwareConfigList(
                            hardwareConfigManager.getTestHardwareConfigs(),
                            hardwareConfigManager.getActiveHardwareConfig()
                    ));
                    break;
                default:
                    System.out.println(msg.getType());
            }
        }

        @Override
        protected void onPong(NanoWSD.WebSocketFrame pong) {

        }

        @Override
        protected void onException(IOException exception) {

        }
    }

    public static TestDashboardInstance getInstance() {
        return instance;
    }

    private void ensureSampleLogs() {
        if (!LOG_ROOT.exists()) {
            LOG_ROOT.mkdirs();
        }
        File[] files = LOG_ROOT.listFiles(pathname -> pathname.isFile() && pathname.getName().endsWith(".log"));
        if (files == null || files.length == 0) {
            // Create a few sample .log files
            for (int i = 0; i < 3; i++) {
                File f = new File(LOG_ROOT, String.format("%1$tY_%1$tm_%1$td__%1$tH_%1$tM_%1$tS_%1$tL__TestOpMode_%2$d.log", System.currentTimeMillis() - i * 60000L, i + 1));
                try (FileOutputStream fos = new FileOutputStream(f)) {
                    Random rand = new Random();
                    byte[] buf = new byte[256];
                    rand.nextBytes(buf);
                    fos.write(buf);
                    fos.flush();
                } catch (IOException ignored) {
                }
                // Update last modified to simulate different times
                f.setLastModified(System.currentTimeMillis() - i * 60000L);
            }
        }
    }

    public void start() throws InterruptedException {
        System.out.println("Starting Dashboard instance");

        core.enabled = true;
        ensureSampleLogs();

        core.addConfigVariable("Test", "LATERAL_MULTIPLIER", new ValueProvider<Double>() {
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
        core.addConfigVariable("Test", "RUN_USING_ENCODER", new ValueProvider<Boolean>() {
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
        core.addConfigVariable("Test", "SomeEnum", new ValueProvider<TestEnum>() {
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

        core.addConfigVariable("More Primitives", "Long", new ValueProvider<Long>() {
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
        core.addConfigVariable("More Primitives", "Float", new ValueProvider<Float>() {
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

        while (true) {
            opModeManager.loop();
            Thread.yield();
        }
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
