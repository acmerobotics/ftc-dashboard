import React, { useState } from 'react';

import BaseView, {
  BaseViewHeading,
  BaseViewBody,
  BaseViewProps,
  BaseViewHeadingProps,
  BaseViewIconButton,
  BaseViewIcons,
} from '@/components/views/BaseView';
import { ReactComponent as AddIcon } from '@/assets/icons/add.svg';
import { ReactComponent as SaveIcon } from '@/assets/icons/save.svg';
import { ReactComponent as DownloadIcon } from '@/assets/icons/file_download.svg';
import { ReactComponent as DeleteIcon } from '@/assets/icons/delete.svg';
import PathSegment, { PointInput, AngleInput } from '@/components/views/PathView/PathSegment';
import { SegmentData } from '@/store/types';
import { useDispatch } from 'react-redux';
import { uploadPathAction } from '@/store/actions/path';

type PathSegmentViewProps = BaseViewProps & BaseViewHeadingProps;

const exportPath = (
  start: Omit<SegmentData, 'type' | 'time' | 'headingType'>,
  segments: SegmentData[],
) => `---
startPose:
  x: ${start.x}
  y: ${start.y}
  heading: ${start.heading}
startTangent: ${start.tangent}
waypoints:
${segments
  .map(
    (segment) => `- position:
    x: ${segment.x}
    y: ${segment.y}
  interpolationType: "${segment.headingType.toUpperCase()}"
  heading: ${segment.heading}
  tangent: ${segment.tangent}
  type: ${segment.type}`,
  )
  .join('\n')}
resolution: 0.25
version: 1
`;

const PathSegmentView = ({
  isDraggable = false,
  isUnlocked = false,
}: PathSegmentViewProps) => {
  const dispatch = useDispatch();
  const [startPose, setStartPose] = useState({
    x: 0,
    y: 0,
    tangent: 0,
    heading: 0,
  });
  const [segments, setSegments] = useState([] as SegmentData[]);
  const changeSegment = (i: number, val: Partial<SegmentData>) =>
    setSegments((prev) => {
      Object.assign(prev[i], val);
      return [...prev];
    });
  return (
    <BaseView isUnlocked={isUnlocked}>
      <div className="flex">
        <BaseViewHeading isDraggable={isDraggable}>
          Path Segments
        </BaseViewHeading>
        <BaseViewIcons>
          <BaseViewIconButton onClick={() => setSegments([])}>
            <DeleteIcon className="w-6 h-6" fill="black" />
          </BaseViewIconButton>
          <BaseViewIconButton
            onClick={() => console.log(exportPath(startPose, segments))}
          >
            <DownloadIcon className="w-6 h-6" fill="black" />
          </BaseViewIconButton>
          <BaseViewIconButton
            onClick={() => dispatch(uploadPathAction(startPose, segments))}
          >
            <SaveIcon className="w-6 h-6" />
          </BaseViewIconButton>
          <BaseViewIconButton
            onClick={() =>
              setSegments((prev) =>
                prev.concat([
                  {
                    type: 'Spline',
                    x: 0,
                    y: 0,
                    tangent: 0,
                    time: 0,
                    heading: 0,
                    headingType: 'Tangent',
                  },
                ]),
              )
            }
          >
            <AddIcon className="w-6 h-6" />
          </BaseViewIconButton>
        </BaseViewIcons>
      </div>
      <BaseViewBody className="flex flex-col">
        <div className="flex-grow">
          <div className="flex self-center gap-2 mb-2">
            <div className="flex-grow self-center">Start at</div>
            <PointInput
              valueX={startPose.x}
              valueY={startPose.y}
              onChange={(newVals) =>
                setStartPose((prev) => ({ ...prev, ...newVals }))
              }
            />
          </div>
          <div className="flex self-center gap-2 mb-2">
            <div className="flex-grow self-center">Start Tangent:</div>
            <AngleInput
              value={startPose.tangent}
              name="tangent"
              onChange={(newVals) =>
                setStartPose((prev) => ({ ...prev, ...newVals }))
              }
            />
          </div>
          <div className="flex self-center gap-2 mb-2">
            <div className="flex-grow self-center">Start Heading:</div>
            <AngleInput
              value={startPose.heading}
              name="heading"
              onChange={(newVals) =>
                setStartPose((prev) => ({ ...prev, ...newVals }))
              }
            />
          </div>
          <ol className="list-decimal marker:hover:cursor-move pl-4" start={1}>
            {segments.map((segment, i) => (
              <PathSegment
                key={i}
                index={i}
                onChange={changeSegment}
                data={segment}
              />
            ))}
          </ol>
        </div>
      </BaseViewBody>
    </BaseView>
  );
};

export default PathSegmentView;
