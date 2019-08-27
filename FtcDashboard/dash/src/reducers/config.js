import { cloneDeep } from 'lodash';
import { 
  RECEIVE_CONFIG, 
  UPDATE_CONFIG,
  SAVE_CONFIG,
  REFRESH_CONFIG
} from '../actions/config';
import VariableType from '../enums/VariableType';

const receiveConfig = (baseConfig, newConfig) => {
  baseConfig = baseConfig || {};
  baseConfig.__value = baseConfig.__value || {};
  if (newConfig.__type === VariableType.CUSTOM) {
    const mergedConfig = {
      __type: VariableType.CUSTOM,
      __value: {}
    };
    // iterate over the keys in the new config
    // we treat this as the master config; it's from the server
    for (let key of Object.keys(newConfig.__value)) {
      mergedConfig.__value[key] = receiveConfig(
        baseConfig.__value[key] || {}, newConfig.__value[key]);
    }
    return mergedConfig;
  } else {
    if (baseConfig.__modified) {
      return {
        __type: newConfig.__type,
        __value: newConfig.__value,
        __newValue: baseConfig.__newValue,
        __valid: baseConfig.__valid,
        __modified: true,
        __enumClass: newConfig.__enumClass,
        __enumValues: newConfig.__enumValues
      };
    } else {
      return {
        __type: newConfig.__type,
        __value: newConfig.__value,
        __newValue: newConfig.__value,
        __valid: true,
        __modified: false,
        __enumClass: newConfig.__enumClass,
        __enumValues: newConfig.__enumValues
      };
    }
  }
};

const updateConfig = (baseConfig, configDiff, modified) => {
  if (baseConfig.__type === VariableType.CUSTOM) {
    const mergedConfig = {
      __type: VariableType.CUSTOM,
      __value: {}
    };
    // iterate over the base config keys; the diff
    // is only a subset of those
    for (let key of Object.keys(baseConfig.__value)) {
      if (key in configDiff.__value) {
        // if the config diff has the key, recurse
        mergedConfig.__value[key] = updateConfig(
          baseConfig.__value[key], configDiff.__value[key], modified);
      } else {
        // otherwise just clone the base config
        mergedConfig.__value[key] = cloneDeep(baseConfig.__value[key]);
      }
    }
    return mergedConfig;
  } else {
    // update the value based on the config diff
    return {
      __type: baseConfig.__type,
      __value: baseConfig.__value,
      __newValue: configDiff.__value,
      __valid: configDiff.__valid,
      __modified: modified,
      __enumClass: baseConfig.__enumClass,
      __enumValues: baseConfig.__enumValues
    };
  }
};

const refreshConfig = (config) => {
  if (config.__type === VariableType.CUSTOM) {
    const refreshedConfig = {
      __type: VariableType.CUSTOM,
      __value: {}
    };
    for (let key of Object.keys(config.__value)) {
      refreshedConfig.__value[key] = refreshConfig(config.__value[key]);
    }
    return refreshedConfig;
  } else {
    return {
      __type: config.__type,
      __value: config.__value,
      __newValue: config.__value,
      __valid: true,
      __modified: false,
      __enumClass: config.__enumClass,
      __enumValues: config.__enumValues
    };
  }
};

const initialState = {
  configRoot: {}
};

const config = (state = initialState, action) => {
  switch (action.type) {
  case RECEIVE_CONFIG:
    return {
      ...state,
      configRoot: receiveConfig(state.configRoot, action.configRoot)
    };
  case UPDATE_CONFIG:
    return {
      ...state,
      configRoot: updateConfig(state.configRoot, action.configDiff, true)
    };
  case SAVE_CONFIG:
    return {
      ...state,
      configRoot: updateConfig(state.configRoot, action.configDiff, false)
    };
  case REFRESH_CONFIG:
    return {
      ...state,
      configRoot: refreshConfig(state.configRoot)
    };
  default:
    return state;
  }
};

export default config;
