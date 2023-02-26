import React, { createRef, MouseEventHandler, useState } from 'react';
import PropTypes from 'prop-types';

import { segmentTypes, headingTypes, SegmentData } from '@/store/types';

export const PointInput = ({
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
      className="w-16 h-8 p-2"
      title="x-coordinate in inches"
    />
    <input
      type="number"
      min={-72}
      max={72}
      step={4}
      value={valueY}
      onChange={(evt) => onChange({ y: +evt.target.value })}
      className="w-16 h-8 p-2"
      title="y-coordinate in inches"
    />
  </>
);

export function AngleInput({
  value,
  name,
  onChange,
}: {
  value: number;
  name: string;
  onChange: (_: Partial<SegmentData>) => void;
}) {
  const [isPickingAngle, setIsPickingAngle] = useState(false);
  const angleSelecter = createRef<HTMLDivElement>();
  const pickAngle: MouseEventHandler<HTMLInputElement> = (e) => {
    e.preventDefault();
    e.persist();
    setIsPickingAngle(true);

    if (!angleSelecter.current) return;
    const a = angleSelecter.current;

    a.style.left = e.pageX - 32 + 'px';
    a.style.top = e.pageY - 32 + 'px';

    window.addEventListener('mousemove', ({ x, y }) =>
      requestAnimationFrame(() => {
        const angle = (Math.atan2(y - e.pageY, x - e.pageX) * 180) / Math.PI;
        a.parentElement?.style.setProperty('--angle', angle.toFixed());
      }),
    );
  };

  return (
    <>
      <input
        type="number"
        name={name}
        min={0}
        max={360}
        step={15}
        value={value}
        onChange={(e) => onChange({ [name]: +e.target.value })}
        className="w-16 h-8 p-2"
        title={`${name} in degrees`}
        onContextMenu={pickAngle}
      />
      <div
        className={`${
          isPickingAngle ? 'absolute' : 'hidden'
        } top-0 left-0 w-screen h-screen`}
        onClick={(e) => {
          onChange({
            [name]:
              (+getComputedStyle(e.target as HTMLElement).getPropertyValue(
                '--angle',
              ) +
                360) %
              360,
          });
          setIsPickingAngle(false);
        }}
        onContextMenu={(e) => {
          setIsPickingAngle(false);
          e.preventDefault();
        }}
      >
        <div
          ref={angleSelecter}
          className={`direction-selector absolute w-16 h-16 rounded-full`}
        ></div>
      </div>
    </>
  );
}

const PathSegment = ({
  index,
  data,
  onChange,
}: {
  index: number;
  data: SegmentData;
  onChange: (i: number, val: Partial<SegmentData>) => void;
}) => (
  <li className="my-4 pl-2">
    <div className="flex gap-2 mb-2">
      <select
        className="flex-grow valid rounded py-0"
        value={data.type}
        onChange={(e) =>
          onChange(index, {
            type: e.target.value as (typeof segmentTypes)[number],
          })
        }
      >
        {segmentTypes.map((enumValue) => (
          <option key={enumValue} value={enumValue}>
            {enumValue}
          </option>
        ))}
      </select>
      {data.type === 'Wait' ? (
        <>
          <div className="self-center">for</div>
          <input
            type="number"
            min={0}
            step={0.5}
            value={data.time}
            onChange={(evt) => onChange(index, { time: +evt.target.value })}
            className="w-16 h-8 p-2"
            title="Time in Seconds"
          />
        </>
      ) : (
        <>
          <div className="self-center">to</div>
          <PointInput
            valueX={data.x}
            valueY={data.y}
            onChange={(newVals) => onChange(index, newVals)}
          />
        </>
      )}
    </div>
    {data.type === 'Spline' && (
      <div className="flex self-center gap-2 mb-2">
        <div className="flex-grow self-center">End Tangent:</div>
        <AngleInput
          name="tangent"
          value={data.tangent}
          onChange={(newVals) => onChange(index, newVals)}
        />
      </div>
    )}
    {data.type !== 'Wait' && (
      <div className="flex self-center gap-2 mb-2">
        <div className="self-center">Heading:</div>
        <select
          className="flex-grow valid rounded h-8 py-0"
          value={data.headingType}
          onChange={(e) =>
            onChange(index, {
              headingType: e.target.value as (typeof headingTypes)[number],
            })
          }
        >
          {headingTypes.map((enumValue) => (
            <option key={enumValue} value={enumValue}>
              {enumValue}
            </option>
          ))}
        </select>
        {headingTypes.slice(2).includes(data.headingType) && (
          <AngleInput
            name="heading"
            value={data.heading}
            onChange={(newVals) => onChange(index, newVals)}
          />
        )}
      </div>
    )}
  </li>
);

PathSegment.propTypes = {
  index: PropTypes.number.isRequired,
  data: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default PathSegment;
