import {
  ConfigState,
  ConfigVar,
  ConfigVarState,
  ReceiveConfigAction,
  ReceiveConfigBaselineAction,
  GetConfigBaselineAction,
  RefreshConfigAction,
  SaveConfigAction,
  UpdateConfigAction,
} from '@/store/types/config';

function inflate(v: ConfigVar): ConfigVarState {
  if (v.__type === 'custom') {
    const value = v.__value;
    if (value === null) {
      return {
        __type: 'custom',
        __value: null,
      };
    } else {
      return {
        __type: 'custom',
        __value: Object.keys(value).reduce(
          (acc, key) => ({
            ...acc,
            [key]: inflate(value[key]),
          }),
          {},
        ),
      };
    }
  } else {
    return {
      ...v,
      __newValue: v.__value,
      __valid: true,
    };
  }
}

// merge modified, matching members of base into latest
function mergeModified(
  base: ConfigVarState,
  latest: ConfigVar,
): ConfigVarState {
  if (base.__type === 'custom' && latest.__type === 'custom') {
    const latestValue = latest.__value;
    if (latestValue === null) {
      return {
        __type: 'custom',
        __value: null,
      };
    } else {
      return {
        __type: 'custom',
        __value: Object.keys(latestValue).reduce(
          (acc, key) =>
            base.__value !== null && key in base.__value
              ? {
                  ...acc,
                  [key]: mergeModified(base.__value[key], latestValue[key]),
                }
              : {
                  ...acc,
                  [key]: inflate(latestValue[key]),
                },
          {},
        ),
      };
    }
  } else if (
    base.__type === 'enum' &&
    latest.__type === 'enum' &&
    base.__enumClass === latest.__enumClass &&
    base.__value !== base.__newValue
  ) {
    return {
      ...base,
      __value: latest.__value,
    };
  } else if (
    base.__type === latest.__type &&
    /* type checker reminder */ base.__type !== 'custom' &&
    latest.__type !== 'custom' &&
    base.__value !== base.__newValue
  ) {
    return {
      ...base,
      __value: latest.__value,
    };
  } else {
    return inflate(latest);
  }
}

function revertModified(state: ConfigVarState): ConfigVarState {
  if (state.__type === 'custom') {
    const value = state.__value;
    if (value === null) {
      return {
        __type: 'custom',
        __value: null,
      };
    } else {
      return {
        __type: 'custom',
        __value: Object.keys(value).reduce(
          (acc, key) => ({
            ...acc,
            [key]: inflate(value[key]),
          }),
          {},
        ),
      };
    }
  } else {
    return {
      ...state,
      __newValue: state.__value,
    };
  }
}

// Check if a configuration variable differs from its baseline value
function isModifiedFromBaseline(
  current: ConfigVarState,
  baseline: ConfigVar | null,
  path: string[] = [],
): boolean {
  if (baseline === null) {
    return false; // No baseline to compare against
  }

  if (current.__type !== baseline.__type) {
    return true;
  }

  if (current.__type === 'custom' && baseline.__type === 'custom') {
    const currentValue = current.__value;
    const baselineValue = baseline.__value;

    if (currentValue === null && baselineValue === null) {
      return false;
    }
    if (currentValue === null || baselineValue === null) {
      return true;
    }

    // Check if any child variables are modified
    const allKeys = new Set([
      ...Object.keys(currentValue),
      ...Object.keys(baselineValue),
    ]);

    for (const key of allKeys) {
      const currentChild = currentValue[key];
      const baselineChild = baselineValue[key];

      if (!currentChild && !baselineChild) {
        continue;
      }
      if (!currentChild || !baselineChild) {
        return true;
      }

      if (isModifiedFromBaseline(currentChild, baselineChild, [...path, key])) {
        return true;
      }
    }

    return false;
  } else {
    // For basic variables, compare the current value with the baseline value
    return current.__value !== baseline.__value;
  }
}

const initialState: ConfigState = {
  configRoot: {
    __type: 'custom',
    __value: {},
  },
  configBaseline: null,
};

const configReducer = (
  state: ConfigState = initialState,
  action:
    | ReceiveConfigAction
    | ReceiveConfigBaselineAction
    | GetConfigBaselineAction
    | UpdateConfigAction
    | SaveConfigAction
    | RefreshConfigAction,
): ConfigState => {
  switch (action.type) {
    case 'RECEIVE_CONFIG':
      return {
        ...state,
        configRoot: mergeModified(state.configRoot, action.configRoot),
      };
    case 'RECEIVE_CONFIG_BASELINE':
      return {
        ...state,
        configBaseline: action.configBaseline,
      };
    case 'GET_CONFIG_BASELINE':
      // This action is handled by middleware, no state change needed
      return state;
    case 'UPDATE_CONFIG':
      return {
        ...state,
        configRoot: action.configRoot,
      };
    case 'REFRESH_CONFIG':
      return {
        ...state,
        configRoot: revertModified(state.configRoot),
      };
    default:
      return state;
  }
};

export default configReducer;
export { isModifiedFromBaseline };
