import React from 'react';
import styled from 'styled-components';

import { ConfigurableView } from '../enums/ConfigurableView';

import { ReactComponent as CameraIcon } from '../assets/icons/camera.svg';
import { ReactComponent as SettingsIcon } from '../assets/icons/settings.svg';
import { ReactComponent as ChartIcon } from '../assets/icons/chart.svg';
import { ReactComponent as ApiIcon } from '../assets/icons/api.svg';
import { ReactComponent as SubjectIcon } from '../assets/icons/subject.svg';
import { ReactComponent as WidgetIcon } from '../assets/icons/widgets.svg';
import { ReactComponent as ListIcon } from '../assets/icons/list.svg';

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
  className: `rounded bg-white border border-gray-300 hover:border-gray-400 shadow-md hover:shadow-lg flex justify-start items-center px-4 py-4 transform transition
    hover:-translate-y-0.5 focus:-translate-y-0.5 focus:border-0 focus:outline-none ring-2 ring-transparent ${
      isOpen
        ? 'pointer-events-auto opacity-100 scale-100'
        : 'pointer-events-none opacity-0 scale-75'
    } ${customStyles}`,
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
    icon: <WidgetIcon className="w-6 h-6" />,
    customStyles: 'focus:ring-red-600',
    iconBg: 'bg-red-500',
  },
  {
    title: 'Field View',
    view: ConfigurableView.FIELD_VIEW,
    icon: <ApiIcon className="w-7 h-7 transform rotate-45" />,
    customStyles: 'focus:ring-blue-600',
    iconBg: 'bg-blue-500',
  },
  {
    title: 'Graph View',
    view: ConfigurableView.GRAPH_VIEW,
    icon: <ChartIcon className="text-white w-6 h-6" />,
    customStyles: 'focus:ring-green-600',
    iconBg: 'bg-green-500',
  },
  {
    title: 'Config View',
    view: ConfigurableView.CONFIG_VIEW,
    icon: <SettingsIcon className="w-6 h-6" />,
    customStyles: 'focus:ring-orange-600',
    iconBg: 'bg-orange-500',
  },
  {
    title: 'Telemetry View',
    view: ConfigurableView.TELEMETRY_VIEW,
    icon: <ListIcon className="w-7 h-7" />,
    customStyles: 'focus:ring-yellow-600',
    iconBg: 'bg-yellow-500',
  },
  {
    title: 'Logging View',
    view: ConfigurableView.LOGGING_VIEW,
    icon: <SubjectIcon className="w-6 h-6" />,
    customStyles: 'focus:ring-ping-600',
    iconBg: 'bg-pink-500',
  },
  {
    title: 'Camera View',
    view: ConfigurableView.CAMERA_VIEW,
    icon: <CameraIcon className="w-5 h-5" />,
    customStyles: 'focus:ring-purple-600',
    iconBg: 'bg-purple-500',
  },
];

const ViewPicker = (props: ViewPickerProps) => {
  return (
    <Container {...props}>
      {listContent.map((item, index) => (
        <CardButton
          key={item.title}
          {...props}
          index={index}
          customStyles={item.customStyles}
          onClick={() => props.clickEvent(item.view)}
          disabled={!props.isOpen}
        >
          <div className={`w-8 h-8  rounded mr-3 flex-center ${item.iconBg}`}>
            {React.cloneElement(item.icon)}
          </div>
          <div className="flex flex-col items-start">
            <h3 className="text-lg mt-0 leading-4 font-medium">{item.title}</h3>
          </div>
        </CardButton>
      ))}
    </Container>
  );
};

export default ViewPicker;
