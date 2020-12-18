import { FunctionComponent } from 'react';
import styled from 'styled-components';

import { ConfigurableView } from '../enums/ConfigurableView';

import { ReactComponent as AddIconSVG } from '../assets/icons/add.svg';

type ViewPickerProps = {
  isOpen: boolean;

  bottom: string;
  right: string;

  clickEvent: (item: ConfigurableView) => void;
};

const Container = styled.div<ViewPickerProps>`
  position: fixed;
  bottom: ${({ bottom }) => bottom};
  right: ${({ right }) => right};
`;

const CardContainer = styled.div.attrs({
  className:
    'rounded bg-white border border-gray-200 my-3 shadow-lg flex items-stretch overflow-hidden pointer-events-auto',
})<ViewPickerProps & { index: number }>`
  transform: ${({ isOpen, right }) =>
    isOpen ? 'translateX(0%)' : `translateX(calc(100% + ${right}))`};

  transition: transform 300ms ease;
  transition-delay: ${({ index }) => `${8 * Math.pow(index, 1.5)}ms`};
`;

const listContent = [
  {
    title: 'Field View',
    description:
      'View containing an FTC field. Supports canvas drawing operations.',
    view: ConfigurableView.FIELD_VIEW,
  },
  {
    title: 'Graph View',
    description:
      'View able to display live graphs of numeric telemetry values.',
    view: ConfigurableView.GRAPH_VIEW,
  },
  {
    title: 'Config View',
    description: 'View enabling live variable configuration.',
    view: ConfigurableView.CONFIG_VIEW,
  },
  {
    title: 'Telemetry View',
    description: 'View displaying telemetry data.',
    view: ConfigurableView.TELEMETRY_VIEW,
  },
  {
    title: 'Camera View',
    description: 'View displaying a live webcam stream.',
    view: ConfigurableView.CAMERA_VIEW,
  },
];

const ViewPicker: FunctionComponent<ViewPickerProps> = (
  props: ViewPickerProps,
) => {
  return (
    <Container {...props} className="pointer-events-none">
      {listContent.map((item, index) => (
        <CardContainer key={item.title} {...props} index={index}>
          <button
            className="bg-green-200 h-auto w-12 flex items-center justify-center rounded-l focus:outline-none border border-transparent focus:border-green-600"
            onClick={() => props.clickEvent(item.view)}
          >
            <AddIconSVG fill="#" className="text-green-600" />
          </button>
          <div className="py-4 px-5">
            <h3 className="text-lg">{item.title}</h3>
            <p className="text-sm text-gray-600">{item.description}</p>
          </div>
        </CardContainer>
      ))}
    </Container>
  );
};

export default ViewPicker;
