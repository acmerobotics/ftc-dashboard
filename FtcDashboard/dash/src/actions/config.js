import VariableType from '../enums/VariableType';

export const RECEIVE_CONFIG = 'RECEIVE_CONFIG';
export const GET_CONFIG = 'GET_CONFIG';
export const UPDATE_CONFIG = 'UPDATE_CONFIG';
export const SAVE_CONFIG = 'SAVE_CONFIG';
export const REFRESH_CONFIG = 'REFRESH_CONFIG';

export const receiveConfig = (config) => ({
  type: RECEIVE_CONFIG,
  config
});

export const getConfig = () => ({
  type: GET_CONFIG
});

export const updateConfig = (configDiff) => ({
  type: UPDATE_CONFIG,
  configDiff
});

export const saveConfig = (configDiff) => ({
  type: SAVE_CONFIG,
  configDiff
});

export const refreshConfig = () => ({
  type: REFRESH_CONFIG
});

export const getModifiedDiff = (baseConfig, root = true) => {
  if (baseConfig.__type === VariableType.CUSTOM) {
    const modifiedConfig = {
      __type: VariableType.CUSTOM,
      __value: {}
    };
    for (let key of Object.keys(baseConfig.__value)) {
      const subConfig = getModifiedDiff(baseConfig.__value[key], false);
      if (subConfig) {
        modifiedConfig.__value[key] = subConfig;
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
      __enumClass: baseConfig.__enumClass
    };
  }
};