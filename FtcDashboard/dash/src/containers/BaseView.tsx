import styled from 'styled-components';

const BaseView = styled.div.attrs<{ isUnlocked: boolean }>(
  ({ isUnlocked = false }) => ({
    className: `flex flex-col h-full bg-white bg-opacity-75 overflow-hidden transition-shadow ${
      isUnlocked ? 'shadow-md rounded-md select-none' : ''
    }`,
  }),
)``;

const BaseViewHeading = styled.h2.attrs<{ isDraggable: boolean }>(
  ({ isDraggable = false }) => ({
    className: `text-xl w-full px-4 py-2 font-medium ${
      isDraggable ? 'grab-handle' : ''
    }`,
  }),
)``;

const BaseViewBody = styled.div.attrs({
  className: 'px-4',
})`
  flex: 1;
  overflow: auto;
`;

const BaseViewIcons = styled.div.attrs({
  className: 'flex items-center mr-3 space-x-1',
})``;

const BaseViewIcon = styled.div.attrs({
  className: 'w-8 h-8 flex-center',
})``;

const BaseViewIconButton = styled.button.attrs({
  className: 'icon-btn w-8 h-8',
})``;

export {
  BaseView as default,
  BaseViewHeading,
  BaseViewBody,
  BaseViewIcons,
  BaseViewIcon,
  BaseViewIconButton,
};
