import React, {
  FunctionComponent,
  ReactNode,
  ReactElement,
  useState,
} from 'react';
import styled from 'styled-components';

import CreateSVG from '../../assets/icons/create.svg';

interface RadialFabProps {
  width?: string;
  height?: string;

  bottom?: string;
  right?: string;
  children?: ReactNode;
}

const FixedContainer = styled.div<RadialFabProps>`
  position: fixed;
  bottom: ${({ bottom }) => bottom};
  right: ${({ right }) => right};
`;

const FloatingButton = styled.button<RadialFabProps>`
  width: ${({ width }) => width};
  height: ${({ height }) => height};

  border-radius: 50%;

  padding: 0;

  border: none;
  outline: none;
`;

const SvgContainer = styled.div<RadialFabProps>`
  background: blue;
  width: 100%;
  height: 100%;

  display: flex;
  justify-content: center;
  align-items: center;

  border-radius: 50%;
  background: #f43f5e;
  box-shadow: 0 2px 2px 0 rgba(244, 67, 54, 0.14),
    0 3px 1px -2px rgba(244, 67, 54, 0.2), 0 1px 5px 0 rgba(244, 67, 54, 0.12);

  border: 1px solid #e11d48;

  transition: 300ms ease;

  &:hover {
    box-shadow: 0 14px 26px -12px rgba(244, 67, 54, 0.42),
      0 4px 23px 0px rgba(0, 0, 0, 0.12), 0 8px 10px -5px rgba(244, 67, 54, 0.2);
  }
`;

const CreateSVGIcon = styled.img`
  width: 1.95em;
`;

const RadialFab: FunctionComponent<RadialFabProps> = (
  props: RadialFabProps,
) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <FixedContainer {...props}>
      <FloatingButton onClick={() => setIsOpen(!isOpen)} {...props}>
        <SvgContainer {...props}>
          <CreateSVGIcon src={CreateSVG} />
        </SvgContainer>
      </FloatingButton>
      {React.Children.map(props.children, (e) =>
        React.cloneElement(e as ReactElement, { isOpen }),
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
