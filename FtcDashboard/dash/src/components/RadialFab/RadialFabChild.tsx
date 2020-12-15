import { FunctionComponent } from 'react';

interface RadialFabChildProps {
  icon?: string;
}

const RadialFabChild: FunctionComponent<RadialFabChildProps> = (props) => (
  <div></div>
);

RadialFabChild.defaultProps = {
  icon: '',
};

export default RadialFabChild;
