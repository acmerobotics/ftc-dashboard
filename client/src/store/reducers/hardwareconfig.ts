import {
  RECEIVE_HARDWARE_CONFIG_LIST,
  ReceiveHardwareConfigListAction,
} from '@/store/types';
import { HardwareConfigState } from '@/store/types/hardwareconfig';

const initialState: HardwareConfigState = {
  hardwareConfigs: [],
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
        hardwareConfigs: action.hardwareConfigs,
        currentHardwareConfig: action.currentHardwareConfig,
      };
    }
    default: {
      return state;
    }
  }
};

export default hardwareConfigReducer;
