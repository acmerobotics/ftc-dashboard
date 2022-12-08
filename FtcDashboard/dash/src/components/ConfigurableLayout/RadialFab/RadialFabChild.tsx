import { PropsWithChildren, useRef } from 'react';

import useDelayedTooltip from '@/hooks/useDelayedTooltip';
import ToolTip from '@/components/ToolTip';

type RadialFabChildProps = {
  customClass?: string;

  fineAdjustIconX?: string;
  fineAdjustIconY?: string;

  angle: number;
  openMargin?: string;

  isOpen?: boolean;

  toolTipText?: string;
};

const ButtonContainer = ({
  angle,
  openMargin = '0',
  isOpen = false,
  children,
  ...props
}: RadialFabChildProps & JSX.IntrinsicElements['button']) => {
  const displacementX = `calc(${
    isOpen ? Math.cos(angle) : 0
  } * ${openMargin} - 50%)`;
  const displacementY = `calc(${
    isOpen ? Math.sin(angle) : 0
  } * ${openMargin} - 50%)`;

  return (
    <button
      className={`flex-center absolute top-1/2 left-1/2 z-[-1] rounded-full outline-none transition focus:outline-none ${props.customClass}`}
      style={{
        transform: `translate(${displacementX}, ${displacementY})`,
      }}
      {...props}
    >
      {children}
    </button>
  );
};

const Icon = ({
  fineAdjustIconX = '0',
  fineAdjustIconY = '0',
  isOpen,
  children,
  ...props
}: PropsWithChildren<RadialFabChildProps>) => (
  <div
    className="transition-transform duration-300"
    style={{
      transform: `translate(${fineAdjustIconX}, ${fineAdjustIconY}) rotate(${
        isOpen ? 0 : 90
      }deg)`,
    }}
    {...props}
  >
    {children}
  </div>
);

const RadialFabChild = ({
  toolTipText = '',
  ...props
}: PropsWithChildren<RadialFabChildProps> &
  JSX.IntrinsicElements['button']) => {
  const buttonRef = useRef(null);
  const isShowingTooltip = useDelayedTooltip(0.5, buttonRef);

  return (
    <ButtonContainer {...props} ref={buttonRef}>
      <Icon {...props}>{props.children}</Icon>
      {toolTipText !== '' && (
        <ToolTip isShowing={isShowingTooltip} hoverRef={buttonRef}>
          {toolTipText}
        </ToolTip>
      )}
    </ButtonContainer>
  );
};

export default RadialFabChild;
