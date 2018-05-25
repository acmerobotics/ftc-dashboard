package com.acmerobotics.dashboard.message;

/**
 * Dashboard message types. These values match the corresponding Redux actions in the frontend.
 */
public enum MessageType {
    /* status (also serve as a heartbeat) */
    GET_ROBOT_STATUS,
    RECEIVE_ROBOT_STATUS,

    /* opmode management */
    INIT_OP_MODE,
    START_OP_MODE,
    STOP_OP_MODE,
    GET_OP_MODE_LIST,
    RECEIVE_OP_MODE_LIST,

    /* config */
    RECEIVE_CONFIG_SCHEMA,
    GET_CONFIG_OPTIONS,
    RECEIVE_CONFIG_OPTIONS,
    SAVE_CONFIG_OPTIONS,

    /* telemetry */
    RECEIVE_TELEMETRY
}
