import styled from 'styled-components';

const AbsoluteContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;

  pointer-events: none;
`;

export default function Fab() {
  return <AbsoluteContainer></AbsoluteContainer>;
}
