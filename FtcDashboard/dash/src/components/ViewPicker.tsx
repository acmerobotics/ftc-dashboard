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

const Container = styled.div.attrs({
  className: 'pointer-events-none grid grid-cols-2 gap-x-6 gap-y-5',
})<ViewPickerProps>`
  position: fixed;
  bottom: ${({ bottom }) => bottom};
  right: ${({ right }) => right};
`;

const CardButton = styled.button.attrs<{
  isOpen: boolean;
  customStyles: string;
}>(({ isOpen, customStyles }) => ({
  className: `rounded bg-white border-2 shadow-md hover:shadow-lg flex justify-center px-3 py-4 transform transition
    hover:-translate-y-0.5 focus:-translate-y-0.5 focus:border-0 focus:outline-none ring-2 ring-transparent ${customStyles} ${
    isOpen
      ? 'pointer-events-auto opacity-100 scale-100'
      : 'pointer-events-none opacity-0 scale-75'
  }`,
}))<{
  isOpen: boolean;
  customStyles: string;
  index: number;
}>`
  transition-delay: ${({ index }) => `${8 * Math.pow(index, 1.5)}ms`};
`;

const listContent = [
  {
    title: 'OpMode View',
    view: ConfigurableView.OPMODE_VIEW,
    customStyles:
      'border-red-500 focus:ring-red-600 hover:bg-red-100 focus:bg-red-200',
  },
  {
    title: 'Field View',
    view: ConfigurableView.FIELD_VIEW,
    customStyles:
      'border-blue-500 focus:ring-blue-600 hover:bg-blue-100 focus:bg-blue-200',
  },
  {
    title: 'Graph View',
    view: ConfigurableView.GRAPH_VIEW,
    customStyles:
      'border-green-500 focus:ring-green-600 hover:bg-green-100 focus:bg-green-200',
  },
  {
    title: 'Config View',
    view: ConfigurableView.CONFIG_VIEW,
    customStyles:
      'border-orange-500 focus:ring-orange-600 hover:bg-orange-100 focus:bg-orange-200',
  },
  {
    title: 'Telemetry View',
    view: ConfigurableView.TELEMETRY_VIEW,
    customStyles:
      'border-yellow-500 focus:ring-yellow-600 hover:bg-yellow-100 focus:bg-yellow-200',
  },
  {
    title: 'Camera View',
    view: ConfigurableView.CAMERA_VIEW,
    customStyles:
      'border-purple-500 focus:ring-purple-600 hover:bg-purple-100 focus:bg-purple-200',
  },
];

const ViewPicker: FunctionComponent<ViewPickerProps> = (
  props: ViewPickerProps,
) => {
  return (
    <Container {...props}>
      {listContent.map((item, index) => (
        <CardButton
          key={item.title}
          {...props}
          index={index}
          customStyles={item.customStyles}
          onClick={() => props.clickEvent(item.view)}
        >
          <h3 className="text-lg">{item.title}</h3>
        </CardButton>
      ))}
    </Container>
  );
};

export default ViewPicker;
