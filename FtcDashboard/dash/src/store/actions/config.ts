import VariableType from '../../enums/VariableType';
import {
  Config,
  ConfigCustom,
  GetConfigAction,
  ReceiveConfigAction,
  RefreshConfigAction,
  SaveConfigAction,
  UpdateConfigAction,
  GET_CONFIG,
  REFRESH_CONFIG,
  SAVE_CONFIG,
  UPDATE_CONFIG,
} from '../types';

export const receiveConfig = (config: Config): ReceiveConfigAction => ({
  type: 'RECEIVE_CONFIG',
  configRoot: config,
});

export const getConfig = (): GetConfigAction => ({
  type: GET_CONFIG,
});

export const updateConfig = (configDiff: Config): UpdateConfigAction => ({
  type: UPDATE_CONFIG,
  configDiff,
});

export const saveConfig = (configDiff: Config): SaveConfigAction => ({
  type: SAVE_CONFIG,
  configDiff,
});

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
