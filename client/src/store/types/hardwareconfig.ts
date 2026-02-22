export const SET_HARDWARE_CONFIG = 'SET_HARDWARE_CONFIG';
export const WRITE_HARDWARE_CONFIG = 'WRITE_HARDWARE_CONFIG';
export const DELETE_HARDWARE_CONFIG = 'DELETE_HARDWARE_CONFIG';
export const RECEIVE_HARDWARE_CONFIG_LIST = 'RECEIVE_HARDWARE_CONFIG_LIST';

export type HardwareConfig = {
  name: string;
  xmlContent: string;
  readOnly: boolean;
};

export type HardwareConfigState = {
  hardwareConfigs: HardwareConfig[];
  currentHardwareConfig: string;
};

export type SetHardwareConfigAction = {
  type: typeof SET_HARDWARE_CONFIG;
  hardwareConfigName: string;
};

export type WriteHardwareConfigAction = {
  type: typeof WRITE_HARDWARE_CONFIG;
  hardwareConfigName: string;
  hardwareConfigContents: string;
};

export type DeleteHardwareConfigAction = {
  type: typeof DELETE_HARDWARE_CONFIG;
  hardwareConfigName: string;
};

export type ReceiveHardwareConfigListAction = {
  type: typeof RECEIVE_HARDWARE_CONFIG_LIST;
  hardwareConfigs: HardwareConfig[];
  currentHardwareConfig: string;
};
