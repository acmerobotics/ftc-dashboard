import React, { useCallback, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import BaseView, {
  BaseViewHeading,
  BaseViewHeadingProps,
  BaseViewProps,
} from './BaseView';
import Field from './Field';
import AutoFitCanvas from '../components/AutoFitCanvas';

import { RootState } from '../store/reducers';
import { DrawOp } from '../store/types/telemetry';

type FieldViewProps = BaseViewProps & BaseViewHeadingProps;

const FieldView = ({
  isDraggable = false,
  isUnlocked = false,
}: FieldViewProps) => {
  const fieldRef = useRef<Field | null>(null);

  const renderField = () => {
    if (fieldRef.current) {
      fieldRef.current.render();
    }
  };

  const canvasRef = useCallback((node: typeof AutoFitCanvas) => {
    if (node) {
      fieldRef.current = new Field(node);
      renderField();
    }
  }, []);

  const telemetry = useSelector((state: RootState) => state.telemetry);
  const overlay = useRef<{ ops: DrawOp[] }>({
    ops: [],
  });

  useEffect(() => {
    overlay.current = telemetry.reduce(
      (acc, { fieldOverlay }) =>
        fieldOverlay.ops.length === 0 ? acc : fieldOverlay,
      overlay.current,
    );
    fieldRef.current?.setOverlay(overlay.current);
    fieldRef.current?.renderField();
  }, [telemetry]);

  return (
    <BaseView isUnlocked={isUnlocked}>
      <BaseViewHeading isDraggable={isDraggable}>Field</BaseViewHeading>
      <AutoFitCanvas
        ref={canvasRef}
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        onResize={renderField}
        containerHeight="calc(100% - 3em)"
      />
    </BaseView>
  );
};
