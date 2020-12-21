import styled from 'styled-components';

const BaseView = styled.div.attrs<{ showShadow: boolean }>(
  ({ showShadow = false }) => ({
    className: `h-full px-4 py-2 bg-white bg-opacity-75 overflow-auto transition-shadow ${
      showShadow ? 'shadow-md rounded-md' : ''
    }`,
  }),
)``;

const BaseViewHeading = styled.h2.attrs<{ isDraggable: boolean }>(
  ({ isDraggable = false }) => ({
    className: `${
      isDraggable ? 'grab-handle' : ''
    } text-xl w-full py-2 font-medium`,
  }),
)``;

export { BaseView as default, BaseViewHeading };
