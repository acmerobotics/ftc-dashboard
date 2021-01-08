import styled from 'styled-components';

type BaseViewProps = {
  isUnlocked?: boolean;
};

const BaseView = styled.div.attrs<BaseViewProps>((props) => ({
  className: `flex flex-col h-full bg-white bg-opacity-75 overflow-hidden transition-shadow ${
    props.isUnlocked ? 'shadow-md rounded-md select-none' : ''
  }`,
}))<BaseViewProps>``;

type BaseViewHeadingProps = {
  isDraggable?: boolean;
};

const BaseViewHeading = styled.h2.attrs<BaseViewHeadingProps>((props) => ({
  className: `text-xl w-full px-4 py-2 font-medium ${
    props.isDraggable ? 'grab-handle' : ''
  }`,
}))<BaseViewHeadingProps>``;

const BaseViewBody = styled.div.attrs<{ className?: string }>((props) => ({
  className: `px-4 ${props.className}`,
}))`
  flex: 1;
  overflow: auto;
`;

const BaseViewIcons = styled.div.attrs({
  className: 'flex items-center mr-3 space-x-1',
})``;

const BaseViewIcon = styled.div.attrs({
  className: 'w-8 h-8 flex-center',
})``;

const BaseViewIconButton = styled.button.attrs<{ className?: string }>(
  (props) => ({
    className: `icon-btn w-8 h-8 ${props.className}`,
  }),
)``;

export {
  BaseView as default,
  BaseViewHeading,
  BaseViewBody,
  BaseViewIcons,
  BaseViewIcon,
  BaseViewIconButton,
};
export type { BaseViewProps, BaseViewHeadingProps };
