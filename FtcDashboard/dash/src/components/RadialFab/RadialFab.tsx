import React, { ReactElement } from 'react';
import styled from 'styled-components';

import { WithChildren } from '../../typeHelpers';

type RadialFabProps = {
  isOpen: boolean;
  isShowing: boolean;

  icon: string;

  customClassName: string;

  width?: string;
  height?: string;

  bottom?: string;
  right?: string;

  clickEvent: () => void;
};

const FixedContainer = styled.div<RadialFabProps>`
  position: fixed;
  bottom: ${({ bottom, height, isShowing }) =>
    isShowing ? bottom : `calc(${bottom} - (${height} * 2)) `};
  right: ${({ right }) => right};

  transition: bottom 300ms ease;
`;

const FloatingButton = styled.button.attrs<RadialFabProps>(
  ({ customClassName }) => ({
    className: `focus:outline-none focus:ring-2 focus:ring-opacity-50 flex-center transition ${customClassName}`,
  }),
)<RadialFabProps>`
  width: ${({ width }) => width};
  height: ${({ height }) => height};

  border-radius: 50%;

  padding: 0;

  border: none;
  outline: none !important;

  transition: 300ms ease;
`;

const CreateIcon = styled.img`
  width: 1.95em;
  color: white;
`;

const RadialFab = (props: WithChildren<RadialFabProps>) => {
  return (
    <FixedContainer {...props}>
      <FloatingButton {...props} onClick={props.clickEvent}>
        <CreateIcon src={props.icon} />
      </FloatingButton>
      {React.Children.map(props.children, (e) =>
        React.cloneElement(e as ReactElement, { isOpen: props.isOpen }),
      )}
    </FixedContainer>
  );
};

RadialFab.defaultProps = {
  width: '4em',
  height: '4em',
  bottom: '2em',
  right: '2em',
};

export default RadialFab;
