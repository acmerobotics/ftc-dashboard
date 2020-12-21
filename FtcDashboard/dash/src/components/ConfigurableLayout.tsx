import React, { ReactElement, useState, useEffect, useRef } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import { v4 as uuidv4 } from 'uuid';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import styled from 'styled-components';

import { ConfigurableView } from '../enums/ConfigurableView';
import GraphView from '../containers/GraphView';
import FieldView from '../containers/FieldView';
import ConfigView from '../containers/ConfigView';
import TelemetryView from '../containers/TelemetryView';
import CameraView from '../containers/CameraView';
import OpModeView from '../containers/OpModeView';

import RadialFab from './RadialFab/RadialFab';
import RadialFabChild from './RadialFab/RadialFabChild';
import ViewPicker from './ViewPicker';

import useMouseIdleListener from '../hooks/useMouseIdleListener';

import { ReactComponent as AddSVG } from '../assets/icons/add.svg';
import { ReactComponent as DeleteSweepSVG } from '../assets/icons/delete_sweep.svg';
import DeleteXSVGURL from '../assets/icons/delete_x.svg';
import LockSVGURL from '../assets/icons/lock.svg';
import { ReactComponent as RemoveCircleSVG } from '../assets/icons/remove_circle.svg';
import { ReactComponent as RemoveCircleOutlineSVG } from '../assets/icons/remove_circle_outline.svg';
import CreateSVGURL from '../assets/icons/create.svg';

const VIEW_MAP: { [key in ConfigurableView]: ReactElement } = {
  [ConfigurableView.FIELD_VIEW]: <FieldView />,
  [ConfigurableView.GRAPH_VIEW]: <GraphView />,
  [ConfigurableView.CONFIG_VIEW]: <ConfigView />,
  [ConfigurableView.TELEMETRY_VIEW]: <TelemetryView />,
  [ConfigurableView.CAMERA_VIEW]: <CameraView />,
  [ConfigurableView.OPMODE_VIEW]: <OpModeView />,
};

const HEIGHT_BREAKPOINTS = {
  MEDIUM: 730,
  TALL: 1200,
};

const COL_BREAKPOINTS = {
  lg: 6,
  md: 6,
  sm: 6,
  xs: 6,
  xxs: 6,
};

const Container = styled.div.attrs<{ isLayoutLocked: boolean }>(
  ({ isLayoutLocked }) => ({
    className: `${
      !isLayoutLocked ? 'bg-gray-100' : 'bg-white'
    } transition-colors`,
  }),
)<{ isLayoutLocked: boolean }>`
  position: relative;

  height: calc(100vh - 52px);

  overflow-x: hidden;
  overflow-y: scroll;
  padding-bottom: 1em;

  ${({ isLayoutLocked }) =>
    !isLayoutLocked
      ? 'background-image: radial-gradient(#d2d2d2 5%, transparent 0);'
      : ''}
  background-size: 35px 35px;
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

const DeleteModeButton = styled.button.attrs({
  className: 'focus:outline-none focus:ring',
})`
  background: url(${DeleteXSVGURL}) no-repeat center;
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

interface GridItemType {
  id: string;
  view: ConfigurableView;
  layout: GridItemLayoutType;
}

interface GridItemLayoutType {
  x: number;
  y: number;
  w: number;
  h: number;
  isDraggable: boolean;
  isResizable: boolean;
}

const DEFAULT_GRID: GridItemType[] = [
  {
    id: uuidv4(),
    view: ConfigurableView.FIELD_VIEW,
    layout: { x: 0, y: 0, w: 2, h: 9, isDraggable: true, isResizable: true },
  },
  {
    id: uuidv4(),
    view: ConfigurableView.GRAPH_VIEW,
    layout: { x: 2, y: 0, w: 2, h: 9, isDraggable: true, isResizable: true },
  },
  {
    id: uuidv4(),
    view: ConfigurableView.CONFIG_VIEW,
    layout: { x: 4, y: 0, w: 2, h: 7, isDraggable: true, isResizable: true },
  },
  {
    id: uuidv4(),
    view: ConfigurableView.TELEMETRY_VIEW,
    layout: { x: 4, y: 7, w: 2, h: 2, isDraggable: true, isResizable: true },
  },
];

const DEFAULT_GRID_MEDIUM: GridItemType[] = [
  {
    id: uuidv4(),
    view: ConfigurableView.FIELD_VIEW,
    layout: { x: 0, y: 0, w: 2, h: 13, isDraggable: true, isResizable: true },
  },
  {
    id: uuidv4(),
    view: ConfigurableView.GRAPH_VIEW,
    layout: { x: 2, y: 0, w: 2, h: 13, isDraggable: true, isResizable: true },
  },
  {
    id: uuidv4(),
    view: ConfigurableView.CONFIG_VIEW,
    layout: { x: 4, y: 0, w: 2, h: 11, isDraggable: true, isResizable: true },
  },
  {
    id: uuidv4(),
    view: ConfigurableView.TELEMETRY_VIEW,
    layout: { x: 4, y: 11, w: 2, h: 2, isDraggable: true, isResizable: true },
  },
];

const DEFAULT_GRID_TALL: GridItemType[] = [
  {
    id: uuidv4(),
    view: ConfigurableView.FIELD_VIEW,
    layout: { x: 0, y: 0, w: 2, h: 18, isDraggable: true, isResizable: true },
  },
  {
    id: uuidv4(),
    view: ConfigurableView.GRAPH_VIEW,
    layout: { x: 2, y: 0, w: 2, h: 18, isDraggable: true, isResizable: true },
  },
  {
    id: uuidv4(),
    view: ConfigurableView.CONFIG_VIEW,
    layout: { x: 4, y: 0, w: 2, h: 14, isDraggable: true, isResizable: true },
  },
  {
    id: uuidv4(),
    view: ConfigurableView.TELEMETRY_VIEW,
    layout: { x: 4, y: 11, w: 2, h: 4, isDraggable: true, isResizable: true },
  },
];

const LOCAL_STORAGE_LAYOUT_KEY = 'configurableLayoutStorage';

const ResponsiveReactGridLayout = WidthProvider(Responsive);

export default function ConfigurableLayout() {
  const containerRef = useRef<HTMLDivElement>(null);

  const [gridItems, setGridItems] = useState(DEFAULT_GRID);

  const [isLayoutLocked, setIsLayoutLocked] = useState(true);
  const [isInDeleteMode, setIsInDeleteMode] = useState(false);
  const [isShowingViewPicker, setIsShowingViewPicker] = useState(false);

  const isFabIdle = useMouseIdleListener({
    bottom: '0',
    right: '0',
    width: '14em',
    height: '13em',
  });

  useEffect(() => {
    const initialLayoutStorageValue = window.localStorage.getItem(
      LOCAL_STORAGE_LAYOUT_KEY,
    );

    const newGridItems = (() => {
      if (initialLayoutStorageValue !== null) {
        return JSON.parse(initialLayoutStorageValue) as GridItemType[];
      } else {
        // This assumes that containerRef isn't null on render
        // This works completely fine now as containerRef is set
        // However, I don't know if this works with concurrent mode
        // This project doesn't use concurrent mode since it's in beta
        // Check back here if concurrent mode is ever enabled
        const height = containerRef.current?.clientHeight;

        if (height) {
          if (height > HEIGHT_BREAKPOINTS.TALL) {
            return DEFAULT_GRID_TALL;
          } else if (height > HEIGHT_BREAKPOINTS.MEDIUM) {
            return DEFAULT_GRID_MEDIUM;
          } else {
            return DEFAULT_GRID;
          }
        } else {
          return DEFAULT_GRID;
        }
      }
    })();
    setIsLayoutLocked(!newGridItems.every((e) => e.layout.isResizable));
    setGridItems(newGridItems);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      LOCAL_STORAGE_LAYOUT_KEY,
      JSON.stringify([...gridItems]),
    );
  }, [gridItems]);

  const addItem = (item: ConfigurableView) => {
    // This is set at 6 right now because all the breakpoints are set to 6 columns
    // Make this dynamic if responsive column breakpoints are set
    const COLS = 6;
    const ITEM_WIDTH = 2;
    const ITEM_HEIGHT = 4;

    let desiredX = 0;

    let gridMaxY = Math.max(...gridItems.map((e) => e.layout.y + e.layout.h));
    gridMaxY = isFinite(gridMaxY) ? gridMaxY : 0;

    if (gridItems.length != 0) {
      const maxX = Math.max(
        ...gridItems
          .filter((e) => e.layout.y + e.layout.h === gridMaxY)
          .map((e) => e.layout.x + e.layout.w),
      );
      if (maxX <= COLS - ITEM_WIDTH) {
        desiredX = maxX;
        gridMaxY -= ITEM_HEIGHT;
      }
    }

    setGridItems([
      ...gridItems,
      {
        id: uuidv4(),
        view: item,
        layout: {
          x: desiredX,
          y: gridMaxY,
          w: ITEM_WIDTH,
          h: ITEM_HEIGHT,
          isDraggable: !isLayoutLocked,
          isResizable: !isLayoutLocked,
        },
      },
    ]);
  };

  const removeItem = (id: string) => {
    setGridItems(gridItems.filter((e) => e.id != id));
  };

  const onLayoutChange = (layout: Layout[]) => {
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

  const clickFAB = () => {
    const toBeLocked = !isLayoutLocked;

    setIsLayoutLocked(toBeLocked);
    setGridItems(
      gridItems.map((i) => {
        i.layout = {
          ...i.layout,
          isResizable: !toBeLocked,
          isDraggable: !toBeLocked,
        };
        return i;
      }),
    );

    if (toBeLocked) setIsShowingViewPicker(false);
  };

  return (
    <Container ref={containerRef} isLayoutLocked={isLayoutLocked}>
      {gridItems.length == 0 ? (
        <div
          className={`text-center mt-16 p-12 transition-colors ${
            isLayoutLocked ? 'bg-white' : 'bg-gray-100'
          }`}
        >
          <h3 className="text-2xl">Your custom layout is empty!</h3>
          <p className="text-gray-600 mt-3">
            Press the floating pencil icon near the bottom right
            <br />
            and then click the green plus button to create your own layouts!
          </p>
        </div>
      ) : (
        ''
      )}
      <ResponsiveReactGridLayout
        className="layout"
        cols={COL_BREAKPOINTS}
        resizeHandles={['se']}
        draggableHandle=".grab-handle"
        compactType={null}
        rowHeight={isLayoutLocked ? 70 : 60}
        layouts={{
          lg: gridItems.map((item) => ({ i: item.id, ...item.layout })),
        }}
        onLayoutChange={onLayoutChange}
        margin={isLayoutLocked ? [0, 0] : [10, 10]}
      >
        {gridItems.map((item) => (
          <div key={item.id}>
            {React.cloneElement(VIEW_MAP[item.view], {
              isDraggable: item.layout.isDraggable,
              showShadow: !isLayoutLocked,
            })}
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
      <RadialFab
        width="4em"
        height="4em"
        bottom="2em"
        right="3.5em"
        isOpen={!isLayoutLocked}
        isShowing={!(isFabIdle && isLayoutLocked)}
        clickEvent={clickFAB}
        icon={isLayoutLocked ? LockSVGURL : CreateSVGURL}
        customClassName={`${
          isLayoutLocked
            ? `bg-gray-500 focus:ring-gray-600 shadow-gray-900-md-prominent hover:shadow-gray-900-lg-prominent`
            : `bg-red-500 focus:ring-red-600 shadow-red-500-md-prominent hover:shadow-red-500-lg-prominent`
        }`}
      >
        <RadialFabChild
          bgColor="#22C55E"
          borderColor="#16A34A"
          angle={(-80 * Math.PI) / 180}
          openMargin="5em"
          fineAdjustIconX="2%"
          fineAdjustIconY="2%"
          toolTipText="Add Item"
          clickEvent={() => setIsShowingViewPicker(!isShowingViewPicker)}
        >
          <AddSVG className="text-white w-6 h-6" />
        </RadialFabChild>
        <RadialFabChild
          bgColor={`${isInDeleteMode ? '#F97316' : '#F59E0B'}`}
          borderColor={`${isInDeleteMode ? '#EA580C' : '#D97706'}`}
          angle={(-135 * Math.PI) / 180}
          openMargin="5em"
          fineAdjustIconX="0"
          fineAdjustIconY="0"
          toolTipText="Delete Item"
          clickEvent={() => setIsInDeleteMode(!isInDeleteMode)}
        >
          {isInDeleteMode ? (
            <RemoveCircleOutlineSVG className="w-5 h-5" />
          ) : (
            <RemoveCircleSVG className="w-5 h-5" />
          )}
        </RadialFabChild>
        <RadialFabChild
          bgColor={`${isLayoutLocked ? `#4B5563` : `#4F46E5`}`}
          borderColor={`${isLayoutLocked ? `#374151` : `#4338CA`}`}
          angle={(170 * Math.PI) / 180}
          openMargin="5em"
          fineAdjustIconX="8%"
          fineAdjustIconY="-2%"
          toolTipText="Clear Layout"
          clickEvent={() => setGridItems([])}
        >
          <DeleteSweepSVG className="w-5 h-5" />
        </RadialFabChild>
      </RadialFab>
      <ViewPicker
        isOpen={isShowingViewPicker}
        bottom="11em"
        right="1.5em"
        clickEvent={addItem}
      />
    </Container>
  );
}
