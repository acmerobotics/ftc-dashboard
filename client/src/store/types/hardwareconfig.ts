export const SET_HARDWARE_CONFIG = 'SET_HARDWARE_CONFIG';
export const RECEIVE_HARDWARE_CONFIG_LIST = 'RECEIVE_HARDWARE_CONFIG_LIST';

export type HardwareConfigState = {
  hardwareConfigList: string[];
  currentHardwareConfig: string;
};

export type SetHardwareConfigAction = {
  type: typeof SET_HARDWARE_CONFIG;
  hardwareConfigName: string;
};

export type ReceiveHardwareConfigListAction = {
  type: typeof RECEIVE_HARDWARE_CONFIG_LIST;
  hardwareConfigList: string[];
  currentHardwareConfig: string;
};
