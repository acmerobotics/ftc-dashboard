package com.acmerobotics.roadrunner;

import com.acmerobotics.dashboard.DashboardCore;
import com.acmerobotics.dashboard.RobotStatus;
import com.acmerobotics.dashboard.SocketHandler;
import com.acmerobotics.dashboard.config.ValueProvider;
import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.redux.InitOpMode;
import com.acmerobotics.dashboard.message.redux.ReceiveOpModeList;
import com.acmerobotics.dashboard.message.redux.ReceiveRobotStatus;
import com.acmerobotics.dashboard.telemetry.TelemetryPacket;
import com.acmerobotics.roadrunner.testopmode.TestOpMode;
import com.acmerobotics.roadrunner.testopmode.TestOpModeManager;

import java.util.stream.Collectors;

public class TestDashboardInstance {
    private static TestDashboardInstance instance = new TestDashboardInstance();

    final String DEFAULT_OP_MODE_NAME = "$Stop$Robot$";
    TestOpModeManager opModeManager = new TestOpModeManager();

    private TelemetryPacket currentPacket;

    DashboardCore core = new DashboardCore(sendFun -> new SocketHandler() {
        @Override
        public void onOpen() {
            opModeManager.setSendFun(sendFun);
            sendFun.send(new ReceiveOpModeList(
                    opModeManager
                            .getTestOpModes()
                            .stream().map(TestOpMode::getName)
                            .collect(Collectors.toList())
            ));
        }

        @Override
        public void onClose() {
            opModeManager.clearSendFun();
        }

        @Override
        public void onMessage(Message message) {
            switch (message.getType()) {
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

                    sendFun.send(new ReceiveRobotStatus(
                            new RobotStatus(true, opModeName, opModeStatus, "", "")
                    ));
                    break;
                }
                case INIT_OP_MODE: {
                    InitOpMode initOpMode = (InitOpMode) message;
                    opModeManager.initOpMode(initOpMode.getOpModeName());
                    break;
                }
                case START_OP_MODE:
                    opModeManager.startOpMode();
                    break;
                case STOP_OP_MODE:
                    opModeManager.stopOpMode();
                default:
                    System.out.println(message.getType());
            }
        }
    });

    public static TestDashboardInstance getInstance() {
        return instance;
    }

    public void start() throws InterruptedException {
        System.out.println("Starting Dashboard instance");

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
        if (currentPacket != null)
            core.sendTelemetryPacket(currentPacket);
    }
}
