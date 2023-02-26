export const segmentTypes = ['Line', 'Spline', 'Wait'] as const;
export const headingTypes = [
  'Tangent',
  'Constant',
  'Linear',
  'Spline',
] as const;
export type SegmentData = {
  type: typeof segmentTypes[number];
  x: number;
  y: number;
  tangent: number;
  time: number;
  heading: number;
  headingType: typeof headingTypes[number];
};

export type Path = {
  start: Omit<SegmentData, 'type' | 'time' | 'headingType'>;
  segments: SegmentData[];
};
