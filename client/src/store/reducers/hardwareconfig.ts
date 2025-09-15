import {
  RECEIVE_HARDWARE_CONFIG_LIST,
  ReceiveHardwareConfigListAction,
  HardwareConfigState,
} from '@/store/types';

const initialState: HardwareConfigState = {
  hardwareConfigList: [],
  currentHardwareConfig: '',
};

const hardwareConfigReducer = (
  state = initialState,
  action: ReceiveHardwareConfigListAction,
) => {
  switch (action.type) {
    case RECEIVE_HARDWARE_CONFIG_LIST: {
      return {
        ...state,
        hardwareConfigList: action.hardwareConfigList,
        currentHardwareConfig: action.currentHardwareConfig,
      };
    }
    default: {
      return state;
    }
  }
};

export default hardwareConfigReducer;
