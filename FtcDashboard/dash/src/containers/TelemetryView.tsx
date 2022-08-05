import React from 'react';
import { useSelector } from 'react-redux';

import BaseView, {
  BaseViewHeading,
  BaseViewBody,
  BaseViewProps,
  BaseViewHeadingProps,
} from './BaseView';
import { RootState } from '../store/reducers';

type TelemetryViewProps = BaseViewProps & BaseViewHeadingProps;

const TelemetryView = ({
  isDraggable = false,
  isUnlocked = false,
}: TelemetryViewProps) => {
  const telemetry = useSelector((state: RootState) => state.telemetry);

  const telemetryLines = Object.keys(telemetry.data).map((key) => (
    <span key={key}>
      {key}: {telemetry.data[key]}
      <br />
    </span>
  ));

  const telemetryLog = telemetry.log.map((line: string, i: number) => (
    <span key={i}>
      {line}
      <br />
    </span>
  ));

  return (
    <BaseView isUnlocked={isUnlocked}>
      <BaseViewHeading isDraggable={isDraggable}>Telemetry</BaseViewHeading>
      <BaseViewBody>
        <p>{telemetryLines}</p>
        <p>{telemetryLog}</p>
      </BaseViewBody>
    </BaseView>
  );
};

export default TelemetryView;
