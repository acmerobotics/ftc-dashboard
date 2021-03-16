import React, { useRef } from 'react';
import styled from 'styled-components';

import { WithChildren } from '../../typeHelpers';
import useDelayedTooltip from '../../hooks/useDelayedTooltip';
import ToolTip from '../ToolTip';

type RadialFabChildProps = {
  customClass?: string;

  fineAdjustIconX?: string;
  fineAdjustIconY?: string;

  angle: number;
  openMargin?: string;

  isOpen?: boolean;

  toolTipText?: string;

  clickEvent?: (e: React.MouseEvent) => void;
};

const ButtonContainer = styled.button.attrs<RadialFabChildProps>(
  ({ customClass }) => ({
    className: `top-1/2 left-1/2 rounded-full outline-none focus:outline-none relative flex-center transition ${customClass}`,
  }),
)<RadialFabChildProps>`
  /* Not sure why but removing this and replacing it with the tailwind absolute class breaks the button */
  position: absolute;

  transform: ${({ angle, openMargin, isOpen }) => {
    const displacementX = `calc(${
      isOpen ? Math.cos(angle) : 0
    } * ${openMargin} - 50%)`;
    const displacementY = `calc(${
      isOpen ? Math.sin(angle) : 0
    } * ${openMargin} - 50%)`;

    return `translate(${displacementX}, ${displacementY})`;
  }};

  z-index: -1;
`;

const Icon = styled.div<RadialFabChildProps>`
  transition: transform 300ms ease;

  transform: ${({ fineAdjustIconX, fineAdjustIconY, isOpen }) =>
    `translate(${fineAdjustIconX}, ${fineAdjustIconY}) rotate(${
      isOpen ? 0 : 90
    }deg)`};
`;

const RadialFabChild = (props: WithChildren<RadialFabChildProps>) => {
  const buttonRef = useRef(null);
  const isShowingTooltip = useDelayedTooltip(0.5, buttonRef);

  return (
    <ButtonContainer {...props} onClick={props.clickEvent} ref={buttonRef}>
      <Icon {...props}>{props.children}</Icon>
      {props.toolTipText !== '' && (
        <ToolTip isShowing={isShowingTooltip} hoverRef={buttonRef}>
          {props.toolTipText}
        </ToolTip>
      )}
    </ButtonContainer>
  );
};

RadialFabChild.defaultProps = {
  fineAdjustIconX: '0',
  fineAdjustIconY: '0',

  openMargin: '0',

  toolTipText: '',

  isOpen: false,
};

export default RadialFabChild;
