import VariableType from '../enums/VariableType';

import { Config, ConfigCustom } from '../reducers/config';

export const RECEIVE_CONFIG = 'RECEIVE_CONFIG';
export const GET_CONFIG = 'GET_CONFIG';
export const UPDATE_CONFIG = 'UPDATE_CONFIG';
export const SAVE_CONFIG = 'SAVE_CONFIG';
export const REFRESH_CONFIG = 'REFRESH_CONFIG';

export type ReceiveConfigAction = {
  type: typeof RECEIVE_CONFIG;
  config: Config;
};

export const receiveConfig = (config: Config): ReceiveConfigAction => ({
  type: 'RECEIVE_CONFIG',
  config,
});

export type GetConfigAction = {
  type: typeof GET_CONFIG;
};

export const getConfig = (): GetConfigAction => ({
  type: GET_CONFIG,
});

export type UpdateConfigAction = {
  type: typeof UPDATE_CONFIG;
  configDiff: Config;
};

export const updateConfig = (configDiff: Config): UpdateConfigAction => ({
  type: UPDATE_CONFIG,
  configDiff,
});

export type SaveConfigAction = {
  type: typeof SAVE_CONFIG;
  configDiff: Config;
};

export const saveConfig = (configDiff: Config): SaveConfigAction => ({
  type: SAVE_CONFIG,
  configDiff,
});

export type RefreshConfigAction = {
  type: typeof REFRESH_CONFIG;
};

export const refreshConfig = (): RefreshConfigAction => ({
  type: REFRESH_CONFIG,
});

export const getModifiedDiff = (baseConfig: Config, root = true) => {
  if (baseConfig.__type === VariableType.CUSTOM) {
    const modifiedConfig: ConfigCustom = {
      __type: VariableType.CUSTOM,
      __value: {},
    };

    for (const key of Object.keys(baseConfig.__value)) {
      const subConfig = getModifiedDiff(baseConfig.__value[key], false);

      if (subConfig) {
        modifiedConfig.__value[key] = subConfig as Config;
      }
    }
    if (Object.entries(modifiedConfig.__value).length > 0 || root) {
      return modifiedConfig;
    }
  } else if (baseConfig.__modified && baseConfig.__valid) {
    return {
      __type: baseConfig.__type,
      __value: baseConfig.__newValue,
      __valid: true,
      __enumClass: baseConfig.__enumClass,
    };
  }
};
