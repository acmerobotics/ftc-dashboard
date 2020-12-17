import React, { ReactElement, useState, useEffect, useRef } from 'react';
import { Responsive, WidthProvider, Layout, Layouts } from 'react-grid-layout';
import { v4 as uuidv4 } from 'uuid';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import styled from 'styled-components';

import GraphView from '../containers/GraphView';
import FieldView from '../containers/FieldView';
import ConfigView from '../containers/ConfigView';
import TelemetryView from '../containers/TelemetryView';

import RadialFab from './RadialFab/RadialFab';
import RadialFabChild from './RadialFab/RadialFabChild';

import AddSVG from '../assets/icons/add.svg';
import DeleteSVG from '../assets/icons/delete.svg';
import DeleteXSVG from '../assets/icons/delete_x.svg';
import LockSVG from '../assets/icons/lock.svg';
import LockOpenSVG from '../assets/icons/lock_open.svg';

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
  sm: 6,
  xs: 6,
  xxs: 6,
};

const Container = styled.div`
  position: relative;

  height: calc(100vh - 4.29em);

  overflow-y: scroll;
  padding-bottom: 1em;
`;

const DeleteModeChild = styled.div`
  background: #fbbf2466;

  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;

  display: flex;
  justify-content: center;
  align-items: center;
`;

const DeleteModeButton = styled.button`
  background: url(${DeleteXSVG});
  background-repeat: no-repeat;
  background-position: center;
  background-size: 3.5em;

  filter: invert(0.9);
  mix-blend-mode: overlay;

  width: 6em;
  height: 6em;

  outline: none;
  border: 3px solid #fff;
  border-radius: 50%;

  padding: 0.3em;
`;

const defaultGrid = [
  {
    id: uuidv4(),
    view: SupportedViews.FIELD_VIEW,
    layout: { x: 0, y: 0, w: 2, h: 9, isDraggable: true, isResizable: true },
  },
  {
    id: uuidv4(),
    view: SupportedViews.GRAPH_VIEW,
    layout: { x: 2, y: 0, w: 2, h: 9, isDraggable: true, isResizable: true },
  },
  {
    id: uuidv4(),
    view: SupportedViews.CONFIG_VIEW,
    layout: { x: 4, y: 0, w: 2, h: 7, isDraggable: true, isResizable: true },
  },
  {
    id: uuidv4(),
    view: SupportedViews.TELEMETRY_VIEW,
    layout: { x: 4, y: 7, w: 2, h: 2, isDraggable: true, isResizable: true },
  },
];

const defaultGridMedium = [
  {
    id: uuidv4(),
    view: SupportedViews.FIELD_VIEW,
    layout: { x: 0, y: 0, w: 2, h: 13, isDraggable: true, isResizable: true },
  },
  {
    id: uuidv4(),
    view: SupportedViews.GRAPH_VIEW,
    layout: { x: 2, y: 0, w: 2, h: 13, isDraggable: true, isResizable: true },
  },
  {
    id: uuidv4(),
    view: SupportedViews.CONFIG_VIEW,
    layout: { x: 4, y: 0, w: 2, h: 11, isDraggable: true, isResizable: true },
  },
  {
    id: uuidv4(),
    view: SupportedViews.TELEMETRY_VIEW,
    layout: { x: 4, y: 11, w: 2, h: 2, isDraggable: true, isResizable: true },
  },
];

const defaultGridTall = [
  {
    id: uuidv4(),
    view: SupportedViews.FIELD_VIEW,
    layout: { x: 0, y: 0, w: 2, h: 18, isDraggable: true, isResizable: true },
  },
  {
    id: uuidv4(),
    view: SupportedViews.GRAPH_VIEW,
    layout: { x: 2, y: 0, w: 2, h: 18, isDraggable: true, isResizable: true },
  },
  {
    id: uuidv4(),
    view: SupportedViews.CONFIG_VIEW,
    layout: { x: 4, y: 0, w: 2, h: 14, isDraggable: true, isResizable: true },
  },
  {
    id: uuidv4(),
    view: SupportedViews.TELEMETRY_VIEW,
    layout: { x: 4, y: 11, w: 2, h: 4, isDraggable: true, isResizable: true },
  },
];

const ResponsiveReactGridLayout = WidthProvider(Responsive);

export default function ConfigurableLayout() {
  const containerRef = useRef<HTMLDivElement>(null);

  const [gridItems, setGridItems] = useState(defaultGrid);
  const [isLayoutLocked, setIsLayoutLocked] = useState(false);
  const [isInDeleteMode, setIsInDeleteMode] = useState(false);

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

  const toggleLayoutLocked = () => {
    setIsLayoutLocked(!isLayoutLocked);
    setGridItems(
      gridItems.map((i) => {
        i.layout = {
          ...i.layout,
          isResizable: !i.layout.isResizable,
          isDraggable: !i.layout.isDraggable,
        };
        return i;
      }),
    );
  };

  const addItem = () => {
    // setGridItems([
    //   ...gridItems,
    //   {
    //     id: uuidv4(),
    //     view: SupportedViews.TELEMETRY_VIEW,
    //     layout: {
    //       x: 4,
    //       y: 11,
    //       w: 2,
    //       h: 4,
    //       isDraggable: true,
    //       isResizable: true,
    //     },
    //   },
    // ]);
  };

  const removeItem = (id: string) => {
    setGridItems(gridItems.filter((e) => e.id != id));
  };

  const onLayoutChange = (layout: Layout[], layouts: Layouts) => {
    setGridItems(
      gridItems.map((e) => {
        const newLayoutValue = layout.find((i) => i.i == e.id);
        if (newLayoutValue != null) {
          const newLayout = {
            x: newLayoutValue.x,
            y: newLayoutValue.y,
            w: newLayoutValue.w,
            h: newLayoutValue.h,
            isDraggable: newLayoutValue.isDraggable ?? true,
            isResizable: newLayoutValue.isResizable ?? true,
          };

          e = { ...e, layout: newLayout };
        }

        return e;
      }),
    );
  };

  return (
    <Container ref={containerRef}>
      <ResponsiveReactGridLayout
        className="layout"
        cols={ColBreakpoints}
        resizeHandles={['ne', 'nw', 'se', 'sw']}
        draggableHandle=".grab-handle"
        compactType={null}
        rowHeight={60}
        layouts={{
          lg: gridItems.map((item) => ({ i: item.id, ...item.layout })),
        }}
        onLayoutChange={onLayoutChange}
      >
        {gridItems.map((item) => (
          <div key={item.id}>
            {ViewMap[item.view]}
            {isInDeleteMode ? (
              <DeleteModeChild>
                <DeleteModeButton
                  onClick={() => {
                    removeItem(item.id);
                  }}
                />
              </DeleteModeChild>
            ) : null}
          </div>
        ))}
      </ResponsiveReactGridLayout>
      <RadialFab width="4em" height="4em" bottom="2em" right="3.5em">
        <RadialFabChild
          bgColor="#16A34A"
          borderColor="#15803D"
          angle={(-80 * Math.PI) / 180}
          openMargin="5em"
          iconSize="1.8em"
          icon={AddSVG}
          fineAdjustIconX="2%"
          fineAdjustIconY="2%"
          clickEvent={addItem}
        />
        <RadialFabChild
          bgColor={`${isLayoutLocked ? `#4B5563` : `#4F46E5`}`}
          borderColor={`${isLayoutLocked ? `#374151` : `#4338CA`}`}
          angle={(-135 * Math.PI) / 180}
          openMargin="5em"
          icon={isLayoutLocked ? LockSVG : LockOpenSVG}
          fineAdjustIconX="-2%"
          fineAdjustIconY="-3%"
          clickEvent={toggleLayoutLocked}
        />
        <RadialFabChild
          bgColor={`${isInDeleteMode ? '#F97316' : '#F59E0B'}`}
          borderColor={`${isInDeleteMode ? '#EA580C' : '#D97706'}`}
          angle={(170 * Math.PI) / 180}
          openMargin="5em"
          icon={isInDeleteMode ? DeleteXSVG : DeleteSVG}
          fineAdjustIconX="-2%"
          fineAdjustIconY="-2%"
          clickEvent={() => setIsInDeleteMode(!isInDeleteMode)}
        />
      </RadialFab>
    </Container>
  );
}
