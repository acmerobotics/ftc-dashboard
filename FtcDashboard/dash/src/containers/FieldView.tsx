import { useEffect, useRef } from 'react';
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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Not the most reliable method. Does not guarantee that canvasRef.current is defined at time of call.
  // Currently, this is only okay because refs are guaranteed to be defined on mount.
  // Behavior is implicit and not under contract.
  // Ideally, this be solved by setting the field in a useCallback passed into the component ref.
  // However, this does not work without a rewrite of AutoFitCanvas due to forwardRef.
  // Would require changes to all components using AutoFitCanvas
  useEffect(() => {
    fieldRef.current = new Field(canvasRef.current);
    renderField();
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
        onResize={renderField}
        containerHeight="calc(100% - 3em)"
      />
    </BaseView>
  );
};

export default FieldView;
