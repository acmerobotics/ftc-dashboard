import {
  ConfigState,
  ConfigVar,
  ConfigVarState,
  ReceiveConfigAction,
  RefreshConfigAction,
  SaveConfigAction,
  UpdateConfigAction,
} from '@/store/types/config';

function inflate(root: ConfigVar): ConfigVarState {
  if (root.__type === 'custom') {
    return {
      __type: 'custom',
      __value: Object.keys(root.__value).reduce(
        (acc, key) => ({
          ...acc,
          [key]: inflate(root.__value[key]),
        }),
        {},
      ),
    };
  } else {
    return {
      ...root,
      __newValue: root.__value,
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
    return {
      __type: 'custom',
      __value: Object.keys(latest.__value).reduce(
        (acc, key) =>
          key in base.__value
            ? {
                ...acc,
                [key]: mergeModified(base.__value[key], latest.__value[key]),
              }
            : {
                ...acc,
                [key]: inflate(latest.__value[key]),
              },
        {},
      ),
    };
  } else if (
    base.__type === 'enum' &&
    latest.__type === 'enum' &&
    base.__enumClass === latest.__enumClass
  ) {
    return {
      ...base,
      __value: latest.__value,
    };
  } else if (
    base.__type === latest.__type &&
    /* type checker reminder */ base.__type !== 'custom' &&
    latest.__type !== 'custom'
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
    return {
      __type: 'custom',
      __value: Object.keys(state.__value).reduce(
        (acc, key) => ({
          ...acc,
          [key]: inflate(state.__value[key]),
        }),
        {},
      ),
    };
  } else {
    return {
      ...state,
      __newValue: state.__value,
    };
  }
}

const initialState: ConfigState = {
  configRoot: {
    __type: 'custom',
    __value: {},
  },
};

const configReducer = (
  state: ConfigState = initialState,
  action:
    | ReceiveConfigAction
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
