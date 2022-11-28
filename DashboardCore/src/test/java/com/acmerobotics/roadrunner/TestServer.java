package com.acmerobotics.roadrunner;

import com.acmerobotics.dashboard.DashboardCore;
import com.acmerobotics.dashboard.RobotStatus;
import com.acmerobotics.dashboard.SocketHandler;
import com.acmerobotics.dashboard.SocketHandlerFactory;
import com.acmerobotics.dashboard.config.ValueProvider;
import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.redux.ReceiveRobotStatus;

public class TestServer {
    public static void main(String[] args) throws InterruptedException {
        DashboardCore core = new DashboardCore(new SocketHandlerFactory() {
            @Override
            public SocketHandler accept(SendFun sendFun) {
                return new SocketHandler() {
                    @Override
                    public void onOpen() {

                    }

                    @Override
                    public void onClose() {

                    }

                    @Override
                    public void onMessage(Message message) {
                        switch (message.getType()) {
                            case GET_ROBOT_STATUS: {
                                sendFun.send(new ReceiveRobotStatus(
                                    new RobotStatus(
                                            false, "", RobotStatus.OpModeStatus.STOPPED, "", ""
                                    )
                                ));
                                break;
                            }
                            default:
                                System.out.println(message.getType());
                        }
                    }
                };
            }
        });

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
            System.out.println("running...");
            Thread.sleep(1000);
        }
    }
}
