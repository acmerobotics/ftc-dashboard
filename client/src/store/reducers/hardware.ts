import {
  HardwareState,
  HardwareVar,
  HardwareVarState,
  ReceiveHardwareAction,
  RefreshHardwareAction,
  SaveHardwareAction,
  UpdateHardwareAction,
} from '@/store/types/hardware';

function inflate(v: HardwareVar): HardwareVarState {
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
  base: HardwareVarState,
  latest: HardwareVar,
): HardwareVarState {
  console.log('mergeModified in hardware called with:', { base, latest });
  /* if (base === null || latest === null) {
    return inflate(latest);
  } else  */ if (base.__type === 'custom' && latest.__type === 'custom') {
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
    base.__type !== 'custom' &&
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

function revertModified(state: HardwareVarState): HardwareVarState {
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

const initialState: HardwareState = {
  hardwareRoot: {
    __type: 'custom',
    __value: {},
  },
};

const hardwareReducer = (
  state: HardwareState = initialState,
  action:
    | ReceiveHardwareAction
    | UpdateHardwareAction
    | SaveHardwareAction
    | RefreshHardwareAction,
): HardwareState => {
  switch (action.type) {
    case 'RECEIVE_HARDWARE':
      return {
        ...state,
        hardwareRoot: mergeModified(state.hardwareRoot, action.hardwareRoot),
      };
    case 'UPDATE_HARDWARE':
      return {
        ...state,
        hardwareRoot: action.hardwareRoot,
      };
    case 'REFRESH_HARDWARE':
      return {
        ...state,
        hardwareRoot: revertModified(state.hardwareRoot),
      };
    default:
      return state;
  }
};

export default hardwareReducer;
