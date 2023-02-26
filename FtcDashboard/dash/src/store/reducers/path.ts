import { SegmentData } from '../types';
import { uploadPathAction } from '../actions/path';

const initialState = {
  start: {} as Omit<SegmentData, 'type' | 'time' | 'headingType'>,
  segments: [] as SegmentData[],
};

const pathReducer = (
  state = initialState,
  action: ReturnType<typeof uploadPathAction>,
) => {
  switch (action.type) {
    // case RECEIVE_CONFIG:
    //   return {
    //     ...state,
    //     configRoot: receiveConfig(state.configRoot, action.configRoot),
    //   };
    // case UPDATE_CONFIG:
    //   return {
    //     ...state,
    //     configRoot: updateConfig(state.configRoot, action.configDiff, true),
    //   };
    // case SAVE_CONFIG:
    //   return {
    //     ...state,
    //     configRoot: updateConfig(state.configRoot, action.configDiff, false),
    //   };
    // case REFRESH_CONFIG:
    //   return {
    //     ...state,
    //     configRoot: refreshConfig(state.configRoot),
    //   };
    default:
      return action;
  }
};

export default pathReducer;