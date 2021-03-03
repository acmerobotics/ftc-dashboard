import { isEmpty } from 'lodash';
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
  ConfigVariable,
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

const getModifiedDiffHelper = (baseConfig: Config): Config | undefined => {
  if (baseConfig.__type === VariableType.CUSTOM) {
    const modifiedConfig: ConfigCustom = {
      __type: VariableType.CUSTOM,
      __value: {},
    };

    for (const key of Object.keys(baseConfig.__value)) {
      const subConfig = getModifiedDiffHelper(baseConfig.__value[key]);

      if (subConfig) {
        modifiedConfig.__value[key] = subConfig as Config;
      }
    }
    if (!isEmpty(modifiedConfig.__value)) {
      return modifiedConfig;
    }
  } else if (baseConfig.__modified && baseConfig.__valid) {
    return {
      __type: baseConfig.__type,
      __value: baseConfig.__newValue,
      __valid: true,
      __enumClass: baseConfig.__enumClass,
    } as ConfigVariable;
  }
};

export const getModifiedDiff = (baseConfig: Config): Config =>
  getModifiedDiffHelper(baseConfig) ?? {
    __type: VariableType.CUSTOM,
    __value: {},
  };
