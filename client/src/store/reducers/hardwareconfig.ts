import {
  RECEIVE_HARDWARE_CONFIG_LIST,
  ReceiveHardwareConfigListAction,
} from '@/store/types';
import { HardwareConfigState } from '@/store/types/hardwareconfig';

const initialState: HardwareConfigState = {
  hardwareConfigList: [],
  hardwareConfigFiles: [],
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
        hardwareConfigFiles: action.hardwareConfigFiles,
        currentHardwareConfig: action.currentHardwareConfig,
      };
    }
    default: {
      return state;
    }
  }
};

export default hardwareConfigReducer;
