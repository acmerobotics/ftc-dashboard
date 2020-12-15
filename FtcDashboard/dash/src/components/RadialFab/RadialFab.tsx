import { FunctionComponent, ReactNode } from 'react';
import styled from 'styled-components';

import CreateSVG from '../../assets/icons/create.svg';

interface RadialFabProps {
  width?: string;
  height?: string;

  bottom?: string;
  right?: string;
  children?: ReactNode;
}

const FloatingButton = styled.button<RadialFabProps>`
  position: fixed;
  bottom: ${({ bottom }) => bottom};
  right: ${({ right }) => right};

  width: ${({ width }) => width};
  height: ${({ height }) => height};

  border-radius: 50%;

  background: #ff2a2a;
  box-shadow: 0 2px 2px 0 rgba(244, 67, 54, 0.14),
    0 3px 1px -2px rgba(244, 67, 54, 0.2), 0 1px 5px 0 rgba(244, 67, 54, 0.12);

  border: 1px solid #c31111;
  outline: none;

  transition: 300ms ease;

  &:hover {
    box-shadow: 0 14px 26px -12px rgba(244, 67, 54, 0.42),
      0 4px 23px 0px rgba(0, 0, 0, 0.12), 0 8px 10px -5px rgba(244, 67, 54, 0.2);
  }
`;

const CreateSVGIcon = styled.img`
  width: 1.95em;
  transform: translate(0.1em, 0.1em); // Just adjusts for visual weighting
`;

const RadialFab: FunctionComponent<RadialFabProps> = (
  props: RadialFabProps,
) => (
  <FloatingButton onClick={() => console.log('test')} {...props}>
    <CreateSVGIcon src={CreateSVG} />
    {props.children}
  </FloatingButton>
);

RadialFab.defaultProps = {
  width: '4em',
  height: '4em',
  bottom: '2em',
  right: '2em',
};

export default RadialFab;
