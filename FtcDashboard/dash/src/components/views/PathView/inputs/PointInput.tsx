import React from 'react';
import { SegmentData } from '@/store/types';

const PointInput = ({
  valueX,
  valueY,
  onChange,
}: {
  valueX: number;
  valueY: number;
  onChange: (_: Partial<SegmentData>) => void;
}) => (
  <>
    <input
      type="number"
      min={-72}
      max={72}
      step={4}
      value={valueX}
      onChange={(evt) => onChange({ x: +evt.target.value })}
      className="h-8 w-16 p-2"
      title="x-coordinate in inches"
    />
    <input
      type="number"
      min={-72}
      max={72}
      step={4}
      value={valueY}
      onChange={(evt) => onChange({ y: +evt.target.value })}
      className="h-8 w-16 p-2"
      title="y-coordinate in inches"
    />
  </>
);

export default PointInput;
