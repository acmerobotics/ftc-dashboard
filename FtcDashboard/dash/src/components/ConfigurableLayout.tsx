import React, { ReactElement, useState, useEffect, useRef } from 'react';
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

const HeightBreakpoints = {
  MEDIUM: 730,
  TALL: 1200,
};

const ColBreakpoints = {
  lg: 6,
  md: 6,
  sm: 3,
  xs: 1,
  xxs: 1,
};

export default function ConfigurableLayout() {
  const ResponsiveReactGridLayout = WidthProvider(Responsive);

  const containerRef = useRef<HTMLDivElement>(null);

  const defaultGrid = [
    {
      id: uuidv4(),
      view: SupportedViews.FIELD_VIEW,
      layout: { x: 0, y: 0, w: 2, h: 9 },
    },
    {
      id: uuidv4(),
      view: SupportedViews.GRAPH_VIEW,
      layout: { x: 2, y: 0, w: 2, h: 9 },
    },
    {
      id: uuidv4(),
      view: SupportedViews.CONFIG_VIEW,
      layout: { x: 4, y: 0, w: 2, h: 7 },
    },
    {
      id: uuidv4(),
      view: SupportedViews.TELEMETRY_VIEW,
      layout: { x: 4, y: 7, w: 2, h: 2 },
    },
  ];

  const defaultGridMedium = [
    {
      id: uuidv4(),
      view: SupportedViews.FIELD_VIEW,
      layout: { x: 0, y: 0, w: 2, h: 13 },
    },
    {
      id: uuidv4(),
      view: SupportedViews.GRAPH_VIEW,
      layout: { x: 2, y: 0, w: 2, h: 13 },
    },
    {
      id: uuidv4(),
      view: SupportedViews.CONFIG_VIEW,
      layout: { x: 4, y: 0, w: 2, h: 11 },
    },
    {
      id: uuidv4(),
      view: SupportedViews.TELEMETRY_VIEW,
      layout: { x: 4, y: 11, w: 2, h: 2 },
    },
  ];

  const defaultGridTall = [
    {
      id: uuidv4(),
      view: SupportedViews.FIELD_VIEW,
      layout: { x: 0, y: 0, w: 2, h: 18 },
    },
    {
      id: uuidv4(),
      view: SupportedViews.GRAPH_VIEW,
      layout: { x: 2, y: 0, w: 2, h: 18 },
    },
    {
      id: uuidv4(),
      view: SupportedViews.CONFIG_VIEW,
      layout: { x: 4, y: 0, w: 2, h: 14 },
    },
    {
      id: uuidv4(),
      view: SupportedViews.TELEMETRY_VIEW,
      layout: { x: 4, y: 11, w: 2, h: 4 },
    },
  ];

  const [gridItems, setGridItems] = useState(defaultGrid);

  useEffect(() => {
    // This assumes that containerRef isn't null on render
    // This works completely fine now as containerRef is set
    // However, I don't know if this works with concurrent mode
    // This project doesn't use concurrent mode since it's in beta
    // Check back here if concurrent mode is ever enabled

    const height = containerRef.current?.clientHeight;

    if (height) {
      if (height > HeightBreakpoints.TALL) {
        setGridItems(defaultGridTall);
      } else if (height > HeightBreakpoints.MEDIUM) {
        setGridItems(defaultGridMedium);
      } else {
        setGridItems(defaultGrid);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        height: 'calc(100vh - 4.29em)',
        overflowY: 'scroll',
        paddingBottom: '1em',
      }}
      ref={containerRef}
    >
      <ResponsiveReactGridLayout
        className="layout"
        cols={ColBreakpoints}
        resizeHandles={['ne', 'nw', 'se', 'sw']}
        draggableHandle=".grab-handle"
        compactType={null}
        rowHeight={60}
      >
        {gridItems.map((item) => (
          <div key={item.id} data-grid={{ i: item.id, ...item.layout }}>
            {ViewMap[item.view]}
          </div>
        ))}
      </ResponsiveReactGridLayout>
    </div>
  );
}
