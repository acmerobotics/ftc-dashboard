import { SegmentData } from '../types/path';

export const uploadPathAction = (
  start: Omit<SegmentData, 'type' | 'time' | 'headingType'>,
  segments: SegmentData[],
) => ({ type: 'UPLOAD_PATH', start, segments });