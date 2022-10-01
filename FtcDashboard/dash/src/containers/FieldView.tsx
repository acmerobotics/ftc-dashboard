import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';

import BaseView, {
  BaseViewHeading,
  BaseViewHeadingProps,
  BaseViewProps,
} from './BaseView';
import Field from './Field';
import AutoFitCanvas from '../components/AutoFitCanvas';

import { ReactComponent as MoreVertSVG } from '../assets/icons/more_vert.svg';

import { RootState } from '../store/reducers';
import { DrawOp } from '../store/types/telemetry';
import useOnClickOutside from '../hooks/useOnClickOutside';
import { Transition } from '@headlessui/react';

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

  // Option menu button
  const optionMenuRef = useRef<HTMLDivElement | null>(null);
  const optionMenuVisibleButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isOptionMenuVisible, setIsOptionMenuVisible] = useState(false);

  useOnClickOutside(
    optionMenuRef,
    () => {
      if (isOptionMenuVisible) setIsOptionMenuVisible(false);
    },
    [optionMenuVisibleButtonRef],
  );

  const [customFieldImageSrc, setCustomFieldImageSrc] = useState<string | null>(
    null,
  );

  const imageUploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (customFieldImageSrc === null) {
      fieldRef.current?.resetFieldImageSrc();
      if (imageUploadInputRef.current) imageUploadInputRef.current.value = '';
    } else {
      fieldRef.current?.setFieldImageSrc(customFieldImageSrc);
    }
  }, [customFieldImageSrc]);

  // TODO: Provide better error feedback
  const onImageInputChange = (evt: Event) => {
    try {
      const files = (evt.target as HTMLInputElement).files;
      if (files !== null && files[0] !== null) {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result) setCustomFieldImageSrc(reader.result.toString());
        };
        reader.onerror = () => {
          throw new Error('Valid image file not provided');
        };

        reader.readAsDataURL(files[0]);
      } else {
        throw new Error('Valid image file not provided');
      }
    } catch (error) {
      alert(`Error while reading image: ${error}`);
    }
  };

  return (
    <BaseView isUnlocked={isUnlocked}>
      <div className="z-10 flex-center">
        <BaseViewHeading isDraggable={isDraggable}>Field</BaseViewHeading>
        <div className="relative inline-block mr-3">
          <button
            className="w-8 h-8 icon-btn"
            ref={optionMenuVisibleButtonRef}
            onClick={() => setIsOptionMenuVisible(!isOptionMenuVisible)}
          >
            <MoreVertSVG className="w-6 h-6" />
          </button>
          <Transition
            show={isOptionMenuVisible}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <div
              ref={optionMenuRef}
              className="absolute right-0 px-2 py-5 mt-2 space-y-2 origin-top-right bg-white border border-gray-200 rounded-md shadow-lg outline-none"
              style={{ zIndex: 99 }}
            >
              <div className="flex flex-row items-center justify-between pb-1 pl-3 mb-1 border-b border-gray-100">
                <p className="text-sm leading-5 text-gray-500 ">
                  Custom Field Image
                </p>
                <button
                  className="px-1 mr-3 text-sm transition border border-transparent rounded hover:border-red-600/100 text-red-600/70 hover:text-red-600/100"
                  onClick={() => setCustomFieldImageSrc(null)}
                >
                  Reset
                </button>
              </div>
              <div className="flex flex-row items-center justify-between">
                <input
                  type="file"
                  className="w-56 ml-5 text-xs rounded"
                  accept="image/*"
                  onChange={onImageInputChange}
                  ref={imageUploadInputRef}
                />
              </div>
            </div>
          </Transition>
        </div>
      </div>
      <AutoFitCanvas
        ref={canvasRef}
        onResize={renderField}
        containerHeight="calc(100% - 3em)"
      />
    </BaseView>
  );
};

export default FieldView;
