package com.acmerobotics.dashboard;

import com.acmerobotics.dashboard.config.ValueProvider;
import com.acmerobotics.dashboard.config.variable.BasicVariable;
import com.acmerobotics.dashboard.config.variable.ConfigVariableDeserializer;
import com.acmerobotics.dashboard.config.variable.ConfigVariableSerializer;
import com.acmerobotics.dashboard.config.variable.CustomVariable;
import com.acmerobotics.dashboard.message.Message;
import com.acmerobotics.dashboard.message.MessageDeserializer;
import com.acmerobotics.dashboard.message.redux.ReceiveConfig;
import com.acmerobotics.dashboard.message.redux.ReceiveTelemetry;
import com.acmerobotics.dashboard.message.redux.SaveConfig;
import com.acmerobotics.dashboard.telemetry.TelemetryPacket;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import fi.iki.elonen.NanoHTTPD;
import fi.iki.elonen.NanoWSD;

/**
 * Main class for interacting with the instance.
 */
public class DashboardCore {
    private static final int PORT = 8000;

    /*
     * Telemetry packets are batched for transmission and sent at this interval.
     */
    private static final int DEFAULT_TELEMETRY_TRANSMISSION_INTERVAL = 100; // ms

    // TODO: figure out what to do about enabled state
    public boolean enabled = true;

    private NanoWSD server;
    private final List<SocketHandlerFactory.SendFun> sockets = new ArrayList<>();

    private ExecutorService telemetryExecutorService;
    private final List<TelemetryPacket> pendingTelemetry = new ArrayList<>(); // guarded by itself
    private volatile int telemetryTransmissionInterval = DEFAULT_TELEMETRY_TRANSMISSION_INTERVAL;

    private final Object configLock = new Object();
    private CustomVariable configRoot; // guarded by configLock

    private Gson gson;

    private class TelemetryUpdateRunnable implements Runnable {
        @Override
        public void run() {
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    List<TelemetryPacket> telemetryToSend;

                    synchronized (pendingTelemetry) {
                        while (pendingTelemetry.isEmpty()) {
                            pendingTelemetry.wait();
                        }

                        telemetryToSend = new ArrayList<>(pendingTelemetry);
                        pendingTelemetry.clear();
                    }

                    // only the latest packet field overlay is used
                    // this helps save bandwidth, especially for more complex overlays
                    for (TelemetryPacket packet : telemetryToSend.subList(0, telemetryToSend.size() - 1)) {
                        packet.fieldOverlay().clear();
                    }

                    sendAll(new ReceiveTelemetry(telemetryToSend));

                    Thread.sleep(telemetryTransmissionInterval);
                } catch (InterruptedException e) {
                    return;
                }
            }
        }
    }

    public DashboardCore(final SocketHandlerFactory shf) {
        gson = new GsonBuilder()
                .registerTypeAdapter(Message.class, new MessageDeserializer())
                .registerTypeAdapter(BasicVariable.class, new ConfigVariableSerializer())
                .registerTypeAdapter(BasicVariable.class, new ConfigVariableDeserializer())
                .registerTypeAdapter(CustomVariable.class, new ConfigVariableSerializer())
                .registerTypeAdapter(CustomVariable.class, new ConfigVariableDeserializer())
                .create();

        configRoot = new CustomVariable();

        server = new NanoWSD(PORT) {
            @Override
            protected NanoWSD.WebSocket openWebSocket(NanoHTTPD.IHTTPSession handshake) {
                return new NanoWSD.WebSocket(handshake) {
                    final NanoWSD.WebSocket ws = this;
                    final SocketHandler sh = new SocketHandlerFactory() {
                        @Override
                        public SocketHandler accept(final SendFun sendFun) {
                            final SocketHandler sh = shf.accept(sendFun);
                            return new SocketHandler() {
                                @Override
                                public void onOpen() {
                                    synchronized (configLock) {
                                        sendFun.send(new ReceiveConfig(configRoot));
                                    }

                                    synchronized (sockets) {
                                        sockets.add(sendFun);
                                    }

                                    sh.onOpen();
                                }

                                @Override
                                public void onClose() {
                                    sockets.remove(sendFun);

                                    sh.onClose();
                                }

                                @Override
                                public void onMessage(Message message) {
                                    switch (message.getType()) {
                                        case GET_CONFIG: {
                                            updateConfig();
                                            break;
                                        }
                                        case SAVE_CONFIG: {
                                            withConfigRoot(new CustomVariableConsumer() {
                                                @Override
                                                public void accept(CustomVariable configRoot) {
                                                    configRoot.update(((SaveConfig) message).getConfigDiff());
                                                }
                                            });

                                            updateConfig();

                                            break;
                                        }
                                        default:
                                            sh.onMessage(message);
                                    }
                                }
                            };
                        }
                    }.accept(new SocketHandlerFactory.SendFun() {
                        @Override
                        public void send(Message message) {
                            try {
                                String messageStr = gson.toJson(message);
                                ws.send(messageStr);
                            } catch (IOException e) {
                                throw new RuntimeException(e);
                            }
                        }
                    });

                    @Override
                    protected void onOpen() {
                        sh.onOpen();
                    }

                    @Override
                    protected void onClose(NanoWSD.WebSocketFrame.CloseCode code,
                                           String reason, boolean initiatedByRemote) {
                        sh.onClose();
                    }

                    @Override
                    protected void onMessage(NanoWSD.WebSocketFrame message) {
                        String payload = message.getTextPayload();
                        Message msg = gson.fromJson(payload, Message.class);
                        sh.onMessage(msg);
                    }

                    @Override
                    protected void onPong(NanoWSD.WebSocketFrame pong) {

                    }

                    @Override
                    protected void onException(IOException exception) {

                    }
                };
            }
        };

        try {
            server.start();
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

        telemetryExecutorService = Executors.newSingleThreadExecutor();
//                Executors.newSingleThreadExecutor("dash telemetry");
        telemetryExecutorService.submit(new TelemetryUpdateRunnable());
    }

    /**
     * Queues a telemetry packet to be sent to all clients. Packets are sent in batches of
     * approximate period {@link #getTelemetryTransmissionInterval()}. Clients display the most
     * recent value received for each key, and the data is cleared upon op mode init or a call to
     * {@link #clearTelemetry()}.
     *
     * @param telemetryPacket packet to send
     */
    public void sendTelemetryPacket(TelemetryPacket telemetryPacket) {
        if (!enabled) {
            return;
        }

        telemetryPacket.addTimestamp();

        synchronized (pendingTelemetry) {
            // TODO: a circular buffer is probably a better idea, but this will work for now
            if (pendingTelemetry.size() > 100) {
                return;
            }

            pendingTelemetry.add(telemetryPacket);

            pendingTelemetry.notifyAll();
        }
    }

    /**
     * Clears telemetry data from all clients.
     */
    public void clearTelemetry() {
        synchronized (pendingTelemetry) {
            pendingTelemetry.clear();

            sendAll(new ReceiveTelemetry(Collections.<TelemetryPacket>emptyList()));
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
        synchronized (configLock) {
            sendAll(new ReceiveConfig(configRoot));
        }
    }

    /**
     * Returns the configuration root for on-the-fly modifications.
     *
     * @deprecated Use {@link #withConfigRoot(CustomVariableConsumer)} for thread safety
     */
    @Deprecated
    public CustomVariable getConfigRoot() {
        return configRoot;
    }

    /**
     * Executes function in an exclusive context for config tree modification. Do not leak the
     * config tree outside the function.
     * @param function
     */
    public void withConfigRoot(CustomVariableConsumer function) {
        synchronized (configLock) {
            function.accept(configRoot);
        }
    }

    /**
     * Add config variable with custom provider.
     * @param category top-level category
     * @param name variable name
     * @param provider getter/setter for the variable
     * @param <T> variable type
     */
    public <T> void addConfigVariable(String category, String name, ValueProvider<T> provider) {
        synchronized (configLock) {
            CustomVariable catVar = (CustomVariable) configRoot.getVariable(category);
            if (catVar != null) {
                catVar.putVariable(name, new BasicVariable<>(provider));
            } else {
                catVar = new CustomVariable();
                catVar.putVariable(name, new BasicVariable<>(provider));
                configRoot.putVariable(category, catVar);
            }
            updateConfig();
        }
    }

    /**
     * Remove a config variable.
     * @param category top-level category
     * @param name variable name
     */
    public void removeConfigVariable(String category, String name) {
        synchronized (configLock) {
            CustomVariable catVar = (CustomVariable) configRoot.getVariable(category);
            catVar.removeVariable(name);
            if (catVar.size() == 0) {
                configRoot.removeVariable(category);
            }
            updateConfig();
        }
    }

    public void sendAll(Message message) {
        synchronized (sockets) {
            for (SocketHandlerFactory.SendFun sf : sockets) {
                sf.send(message);
            }
        }
    }

    public int clientCount() {
        synchronized (sockets) {
            return sockets.size();
        }
    }

    // should we implement autocloseable?
    // what's the protocol there for closed objects (are we just left in an undefined state like an object that has been moved out of?)
    public void close() {
        server.stop();
    }
}
