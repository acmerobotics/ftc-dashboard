import {
  RECEIVE_HARDWARE_CONFIG_LIST,
  SET_HARDWARE_CONFIG,
  WRITE_HARDWARE_CONFIG,
  DELETE_HARDWARE_CONFIG,
  DeleteHardwareConfigAction,
  SetHardwareConfigAction,
  WriteHardwareConfigAction,
  ReceiveHardwareConfigListAction,
  HardwareConfig,
} from '@/store/types/hardwareconfig';

export const setHardwareConfig = (
  hardwareConfigName: string,
): SetHardwareConfigAction => ({
  type: SET_HARDWARE_CONFIG,
  hardwareConfigName,
});

export const writeHardwareConfig = (
  hardwareConfigName: string,
  hardwareConfigContents: string,
): WriteHardwareConfigAction => ({
  type: WRITE_HARDWARE_CONFIG,
  hardwareConfigName,
  hardwareConfigContents,
});

export const deleteHardwareConfig = (
  hardwareConfigName: string,
): DeleteHardwareConfigAction => ({
  type: DELETE_HARDWARE_CONFIG,
  hardwareConfigName,
});

export const receiveHardwareConfigList = (
  hardwareConfigs: HardwareConfig[],
  currentHardwareConfig: string,
): ReceiveHardwareConfigListAction => ({
  type: RECEIVE_HARDWARE_CONFIG_LIST,
  hardwareConfigs,
  currentHardwareConfig,
});
