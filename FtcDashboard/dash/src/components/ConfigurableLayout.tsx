import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import GraphView from '../containers/GraphView';
import FieldView from '../containers/FieldView';
import ConfigView from '../containers/ConfigView';
import TelemetryView from '../containers/TelemetryView';

export default function ConfigurableLayout() {
  const ResponsiveReactGridLayout = WidthProvider(Responsive);

  const colBreakpoints = {
    lg: 3,
    md: 3,
    sm: 2,
    xs: 1,
    xxs: 1
  };

  const defaultLayout: Layout[] = [
    { i: 'a', x: 0, y: 0, w: 1, h: 6, },
    { i: 'b', x: 1, y: 0, w: 1, h: 6 },
    { i: 'c', x: 2, y: 0, w: 1, h: 6 },
    { i: 'd', x: 2, y: 6, w: 1, h: 2 },
  ]

  return (
    <ResponsiveReactGridLayout
      className="layout"
      cols={colBreakpoints}
      layouts={{ lg: defaultLayout }}
      resizeHandles={['se']}
      draggableHandle=".heading"
      verticalCompact={false}
    >
      <div key="a"><FieldView /></div>
      <div key="b"><GraphView /></div>
      <div key="c"><ConfigView /></div>
      <div key="d"><TelemetryView /></div>

    </ResponsiveReactGridLayout>
  )
}