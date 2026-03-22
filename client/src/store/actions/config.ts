import {
  GetConfigAction,
  GetConfigBaselineAction,
  ReceiveConfigAction,
  ReceiveConfigBaselineAction,
  SaveConfigAction,
  RefreshConfigAction,
  UpdateConfigAction,
  ConfigVar,
  ConfigVarState,
} from '@/store/types/config';

export const getConfig = (): GetConfigAction => ({
  type: 'GET_CONFIG',
});

export const getConfigBaseline = (): GetConfigBaselineAction => ({
  type: 'GET_CONFIG_BASELINE',
});

export const receiveConfig = (configRoot: ConfigVar): ReceiveConfigAction => ({
  type: 'RECEIVE_CONFIG',
  configRoot,
});

export const receiveConfigBaseline = (
  configBaseline: ConfigVar,
): ReceiveConfigBaselineAction => ({
  type: 'RECEIVE_CONFIG_BASELINE',
  configBaseline,
});

export const saveConfig = (configDiff: ConfigVar): SaveConfigAction => ({
  type: 'SAVE_CONFIG',
  configDiff,
});

export const updateConfig = (
  configRoot: ConfigVarState,
): UpdateConfigAction => ({
  type: 'UPDATE_CONFIG',
  configRoot,
});

export const refreshConfig = (): RefreshConfigAction => ({
  type: 'REFRESH_CONFIG',
});
