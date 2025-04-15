import { RECEIVE_HARDWARE_CONFIG_LIST, SET_HARDWARE_CONFIG, SetHardwareConfigAction, ReceiveHardwareConfigListAction } from "../types/hardwareconfig";

export const setHardwareConfig = (hardwareConfigName: string): SetHardwareConfigAction => ({
    type: SET_HARDWARE_CONFIG,
    hardwareConfigName,
});

export const receiveHardwareConfigList = (
    hardwareConfigList: string[],
    currentHardwareConfig: string,
): ReceiveHardwareConfigListAction => ({
    type: RECEIVE_HARDWARE_CONFIG_LIST,
    hardwareConfigList,
    currentHardwareConfig,
}
)