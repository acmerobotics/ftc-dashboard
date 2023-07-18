/* eslint-disable no-fallthrough */
import { Path, SegmentData } from '@/store/types';
import {
  addSegmentPathAction,
  clearSegmentsPathAction,
  setSegmentPathAction,
  setStartPathAction,
  uploadPathAction,
} from '@/store/actions/path';

const initialState: Path = {
  start: {
    x: 0,
    y: 0,
    tangent: 0,
    heading: 0,
  }, // as Omit<SegmentData, 'type' | 'time' | 'headingType'>,
  segments: [] as SegmentData[],
};

const pathReducer = (
  state = initialState,
  action:
    | ReturnType<typeof uploadPathAction>
    | ReturnType<typeof setStartPathAction>
    | ReturnType<typeof setSegmentPathAction>
    | ReturnType<typeof clearSegmentsPathAction>
    | ReturnType<typeof addSegmentPathAction>,
) => {
  switch (action.type) {
    case 'SET_PATH':
      return { ...state, ...action };
    case 'ADD_SEGMENT_PATH':
      state.segments.push({
        type: 'Spline',
        x: 0,
        y: 0,
        tangent: 0,
        time: 0,
        heading: 0,
        headingType: 'Tangent',
      });
      return state;
    case 'SET_START_PATH':
      Object.assign(state.start, action.newVals);
      return state;
    case 'SET_SEGMENT_PATH':
      Object.assign(state.segments[action.i], action.newVals);
    // case 'UPLOAD_PATH':
  }
  return state;
};

export default pathReducer;
