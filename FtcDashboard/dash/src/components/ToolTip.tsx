import React, { useRef, FunctionComponent, RefObject, ReactNode } from 'react';
import { createPortal } from 'react-dom';

import styled from 'styled-components';

interface ToolTipElProps {
  isShowing: boolean;
  top: string;
  left: string;
}

export const ToolTipEl = styled.span.attrs<ToolTipElProps>((props) => ({
  className: `fixed rounded-md px-3 py-1 w-max bg-gray-800 bg-opacity-80 text-white text-sm pointer-events-none transform transition ${
    props.isShowing ? '-translate-y-11 opacity-100' : '-translate-y-9 opacity-0'
  }`,
}))<ToolTipElProps>`
  top: ${(props) => props.top};
  left: ${(props) => props.left};
`;

interface ToolTipProps {
  children: ReactNode;
  hoverRef: RefObject<HTMLElement | null>;
  isShowing: boolean;
}

const ToolTip: FunctionComponent<ToolTipProps> = ({
  children,
  hoverRef,
  isShowing,
}: ToolTipProps) => {
  const tooltipRef = useRef<HTMLSpanElement | null>(null);

  return createPortal(
    <ToolTipEl
      ref={tooltipRef}
      isShowing={isShowing}
      top={`${hoverRef.current?.getBoundingClientRect().top}px`}
      left={`${
        (hoverRef.current?.getBoundingClientRect().left ?? 0) +
        (hoverRef.current?.clientWidth ?? 0) / 2 -
        (tooltipRef.current?.clientWidth ?? 0) / 2
      }px`}
    >
      {children}
    </ToolTipEl>,
    document.body,
  );
};

export default ToolTip;
