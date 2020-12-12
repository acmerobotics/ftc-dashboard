import React, { ReactElement, useState } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { v4 as uuidv4 } from 'uuid';

import GraphView from '../containers/GraphView';
import FieldView from '../containers/FieldView';
import ConfigView from '../containers/ConfigView';
import TelemetryView from '../containers/TelemetryView';

enum SupportedViews {
  FIELD_VIEW,
  GRAPH_VIEW,
  CONFIG_VIEW,
  TELEMETRY_VIEW,
}

const ViewMap: { [key in SupportedViews]: ReactElement } = {
  [SupportedViews.FIELD_VIEW]: <FieldView />,
  [SupportedViews.GRAPH_VIEW]: <GraphView />,
  [SupportedViews.CONFIG_VIEW]: <ConfigView />,
  [SupportedViews.TELEMETRY_VIEW]: <TelemetryView />,
};

export default function ConfigurableLayout() {
  const ResponsiveReactGridLayout = WidthProvider(Responsive);

  const colBreakpoints = {
    lg: 3,
    md: 3,
    sm: 2,
    xs: 1,
    xxs: 1,
  };

  const defaultGrid = [
    {
      id: uuidv4(),
      view: SupportedViews.FIELD_VIEW,
      layout: { x: 0, y: 0, w: 1, h: 6 },
    },
    {
      id: uuidv4(),
      view: SupportedViews.GRAPH_VIEW,
      layout: { x: 1, y: 0, w: 1, h: 6 },
    },
    {
      id: uuidv4(),
      view: SupportedViews.CONFIG_VIEW,
      layout: { x: 2, y: 0, w: 1, h: 6 },
    },
    {
      id: uuidv4(),
      view: SupportedViews.TELEMETRY_VIEW,
      layout: { x: 2, y: 6, w: 1, h: 2 },
    },
  ];

  const [gridItems] = useState(defaultGrid);

  return (
    <ResponsiveReactGridLayout
      className="layout"
      cols={colBreakpoints}
      layouts={{
        lg: defaultGrid.map((x) => Object.assign(x.layout, { i: x.id })),
      }}
      resizeHandles={['ne', 'nw', 'se', 'sw']}
      draggableHandle=".grab-handle"
      compactType={null}
    >
      {gridItems.map((item) => (
        <div key={item.id}>
          {ViewMap[item.view]}
          {/* {React.cloneElement(ViewMap[item.view], {
            configurableGridId: item.id,
          })} */}
        </div>
      ))}
    </ResponsiveReactGridLayout>
  );
}
