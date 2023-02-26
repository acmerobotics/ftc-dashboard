import { Path, SegmentData } from '@/store/types/path';

export const uploadPathAction = (
  start: Path['start'],
  segments: Path['segments'],
) => ({ type: 'UPLOAD_PATH' as const, start, segments });

export const setStartPathAction = (newVals: Partial<Path['start']>) => ({
  type: 'SET_START_PATH' as const,
  newVals,
});

export const setSegmentPathAction = (
  i: number,
  newVals: Partial<SegmentData>,
) => ({
  type: 'SET_SEGMENT_PATH' as const,
  i,
  newVals,
});

export const clearSegmentsPathAction = () => ({
  type: 'SET_PATH' as const,
  newVals: { segments: [] },
});

export const addSegmentPathAction = () => ({
  type: 'ADD_SEGMENT_PATH' as const,
});
