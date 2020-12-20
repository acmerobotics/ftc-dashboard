import styled from 'styled-components';

interface BaseViewProps {
  showShadow: boolean;
}

const BaseView = styled.div.attrs<BaseViewProps>(({ showShadow = false }) => ({
  className: `h-full px-4 py-2 bg-white bg-opacity-75 rounded ${
    showShadow ? '' : ''
  }`,
}))``;

export default BaseView;
