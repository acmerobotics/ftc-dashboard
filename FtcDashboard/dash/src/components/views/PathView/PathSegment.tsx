import PropTypes from 'prop-types';

import { segmentTypes, headingTypes, SegmentData } from '@/store/types';

import PointInput from './inputs/PointInput';
import AngleInput from './inputs/AngleInput';

const PathSegment = ({
  data,
  onChange,
}: {
  data: SegmentData;
  onChange: (val: Partial<SegmentData>) => void;
}) => (
  <li className="my-4 pl-2">
    <div className="mb-2 flex gap-2">
      <select
        className="valid flex-grow rounded py-0 dark:border-slate-500/80 dark:bg-slate-700 dark:text-slate-200"
        value={data.type}
        onChange={(e) =>
          onChange({
            type: e.target.value as typeof segmentTypes[number],
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
            onChange={(evt) => onChange({ time: +evt.target.value })}
            className="h-8 w-16 p-2 dark:border-slate-500/80 dark:bg-slate-700 dark:text-slate-200"
            title="Time in Seconds"
          />
        </>
      ) : (
        <>
          <div className="self-center">to</div>
          <PointInput
            valueX={data.x}
            valueY={data.y}
            onChange={(newVals) => onChange(newVals)}
          />
        </>
      )}
    </div>
    {data.type === 'Spline' && (
      <div className="mb-2 flex gap-2 self-center">
        <div className="flex-grow self-center">End Tangent:</div>
        <AngleInput
          name="tangent"
          value={data.tangent}
          onChange={(newVals) => onChange(newVals)}
        />
      </div>
    )}
    {data.type !== 'Wait' && (
      <div className="mb-2 flex gap-2 self-center">
        <div className="self-center">Heading:</div>
        <select
          className="valid h-8 flex-grow rounded py-0 dark:border-slate-500/80 dark:bg-slate-700 dark:text-slate-200"
          value={data.headingType}
          onChange={(e) =>
            onChange({
              headingType: e.target.value as typeof headingTypes[number],
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
            onChange={(newVals) => onChange(newVals)}
          />
        )}
      </div>
    )}
  </li>
);

PathSegment.propTypes = {
  data: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default PathSegment;
