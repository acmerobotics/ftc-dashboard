import { cloneDeep } from 'lodash';
import VariableType from '../../enums/VariableType';
import {
  Config,
  ConfigCustom,
  ConfigState,
  ConfigVariable,
  ReceiveConfigAction,
  RefreshConfigAction,
  SaveConfigAction,
  UpdateConfigAction,
  RECEIVE_CONFIG,
  REFRESH_CONFIG,
  SAVE_CONFIG,
  UPDATE_CONFIG,
} from '../types';

const receiveConfig = (baseConfig: Config, newConfig: Config) => {
  if (newConfig.__type === VariableType.CUSTOM) {
    const mergedConfig: ConfigCustom = {
      __type: VariableType.CUSTOM,
      __value: {},
    };

    // iterate over the keys in the new config
    // we treat this as the master config; it's from the server
    for (const key of Object.keys(newConfig.__value)) {
      let newBaseValue = {} as Config;
      if (typeof baseConfig.__value === 'object') {
        newBaseValue = (<ConfigCustom>baseConfig).__value[key];
      } else {
        newBaseValue = {} as Config;
      }

      mergedConfig.__value[key] = receiveConfig(
        newBaseValue,
        newConfig.__value[key],
      );
    }
    return mergedConfig;
  } else {
    baseConfig = <ConfigVariable>baseConfig;

    if (baseConfig.__modified) {
      return {
        __type: newConfig.__type,
        __value: newConfig.__value,
        __newValue: baseConfig.__newValue,
        __valid: baseConfig.__valid,
        __modified: true,
        __enumClass: newConfig.__enumClass,
        __enumValues: newConfig.__enumValues,
      };
    } else {
      return {
        __type: newConfig.__type,
        __value: newConfig.__value,
        __newValue: newConfig.__value,
        __valid: true,
        __modified: false,
        __enumClass: newConfig.__enumClass,
        __enumValues: newConfig.__enumValues,
      };
    }
  }
};

const updateConfig = (
  baseConfig: Config,
  configDiff: Config,
  modified: boolean,
): Config => {
  if (baseConfig.__type === VariableType.CUSTOM) {
    const mergedConfig: ConfigCustom = {
      __type: VariableType.CUSTOM,
      __value: {},
    };

    // iterate over the base config keys; the diff
    // is only a subset of those
    for (const key of Object.keys(baseConfig.__value)) {
      if (typeof configDiff.__value === 'object' && key in configDiff.__value) {
        // if the config diff has the key, recurse
        mergedConfig.__value[key] = updateConfig(
          baseConfig.__value[key],
          configDiff.__value[key],
          modified,
        );
      } else {
        // otherwise just clone the base config
        mergedConfig.__value[key] = cloneDeep(baseConfig.__value[key]);
      }
    }

    return mergedConfig as Config;
  } else {
    let validValue = true;
    if (typeof configDiff.__value !== 'object') {
      validValue = (configDiff as ConfigVariable).__valid;
    }

    // update the value based on the config diff
    return {
      __type: baseConfig.__type,
      __value: baseConfig.__value,
      __newValue: configDiff.__value,
      __valid: validValue,
      __modified: modified,
      __enumClass: baseConfig.__enumClass,
      __enumValues: baseConfig.__enumValues,
    } as Config;
  }
};

const refreshConfig = (config: Config) => {
  if (config.__type === VariableType.CUSTOM) {
    const refreshedConfig: ConfigCustom = {
      __type: VariableType.CUSTOM,
      __value: {},
    };

    for (const key of Object.keys(config.__value)) {
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
      __enumValues: config.__enumValues,
    };
  }
};

const initialState: ConfigState = {
  configRoot: {} as Config,
};

const configReducer = (
  state: ConfigState = initialState,
  action:
    | ReceiveConfigAction
    | UpdateConfigAction
    | SaveConfigAction
    | RefreshConfigAction,
) => {
  switch (action.type) {
    case RECEIVE_CONFIG:
      return {
        ...state,
        configRoot: receiveConfig(state.configRoot, action.configRoot),
      };
    case UPDATE_CONFIG:
      return {
        ...state,
        configRoot: updateConfig(state.configRoot, action.configDiff, true),
      };
    case SAVE_CONFIG:
      return {
        ...state,
        configRoot: updateConfig(state.configRoot, action.configDiff, false),
      };
    case REFRESH_CONFIG:
      return {
        ...state,
        configRoot: refreshConfig(state.configRoot),
      };
    default:
      return state;
  }
};

export default configReducer;
