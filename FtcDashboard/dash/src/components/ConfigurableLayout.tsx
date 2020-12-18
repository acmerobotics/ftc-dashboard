import React, { ReactElement, useState, useEffect, useRef } from 'react';
import { Responsive, WidthProvider, Layout, Layouts } from 'react-grid-layout';
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

import RadialFab from './RadialFab/RadialFab';
import RadialFabChild from './RadialFab/RadialFabChild';
import ViewPicker from './ViewPicker';

import { ReactComponent as AddSVG } from '../assets/icons/add.svg';
import { ReactComponent as DeleteSVG } from '../assets/icons/delete.svg';
import DeleteXSVGURL, {
  ReactComponent as DeleteXSVG,
} from '../assets/icons/delete_x.svg';
import { ReactComponent as LockSVG } from '../assets/icons/lock.svg';

import { ReactComponent as LockOpenSVG } from '../assets/icons/lock_open.svg';

const ViewMap: { [key in ConfigurableView]: ReactElement } = {
  [ConfigurableView.FIELD_VIEW]: <FieldView />,
  [ConfigurableView.GRAPH_VIEW]: <GraphView />,
  [ConfigurableView.CONFIG_VIEW]: <ConfigView />,
  [ConfigurableView.TELEMETRY_VIEW]: <TelemetryView />,
  [ConfigurableView.CAMERA_VIEW]: <CameraView />,
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

  height: calc(100vh - 58px);

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

const DeleteModeButton = styled.button.attrs({
  className: 'focus:outline-none focus:ring',
})`
  background: url(${DeleteXSVGURL});
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

const defaultGridMedium = [
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

const defaultGridTall = [
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

const LOCAL_STORAGE_LAYOUT_KEY = 'configurableStorageLayout';

const ResponsiveReactGridLayout = WidthProvider(Responsive);

export default function ConfigurableLayout() {
  const containerRef = useRef<HTMLDivElement>(null);

  const [gridItems, setGridItems] = useState(defaultGrid);

  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isLayoutLocked, setIsLayoutLocked] = useState(false);
  const [isInDeleteMode, setIsInDeleteMode] = useState(false);
  const [isShowingViewPicker, setIsShowingViewPicker] = useState(false);

  useEffect(() => {
    const initialLayoutStorageValue = window.localStorage.getItem(
      LOCAL_STORAGE_LAYOUT_KEY,
    );

    if (initialLayoutStorageValue !== null) {
      setGridItems(JSON.parse(initialLayoutStorageValue));
    } else {
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
      } else {
        setGridItems(defaultGrid);
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      LOCAL_STORAGE_LAYOUT_KEY,
      JSON.stringify(gridItems),
    );
  }, [gridItems]);

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

  const addItem = (item: ConfigurableView) => {
    // TODO: Implement smart insertion algorithm
    // It just adds the item on a new grid row right now.
    // const newItemWidth = 2;
    // const newItemHeight = 4;

    // let newItemX = 0;
    // let newItemY = 0;

    // const gridMaxX = Math.max(...gridItems.map((e) => e.layout.x + e.layout.w));
    let gridMaxY = Math.max(...gridItems.map((e) => e.layout.y + e.layout.h));
    gridMaxY = isFinite(gridMaxY) ? gridMaxY : 0;

    setGridItems([
      ...gridItems,
      {
        id: uuidv4(),
        view: item,
        layout: {
          x: 0,
          y: gridMaxY,
          w: 2,
          h: 4,
          isDraggable: true,
          isResizable: true,
        },
      },
    ]);
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
      {gridItems.length == 0 ? (
        <div className="text-center mt-16">
          <h3 className="text-2xl">Your custom layout is empty!</h3>
          <p className="text-gray-600 mt-3">
            Press the floating pencil icon near the bottom left
            <br />
            and then click the green plus button to create your own layouts!
          </p>
        </div>
      ) : (
        ''
      )}
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
            {React.cloneElement(ViewMap[item.view], {
              isDraggable: !isLayoutLocked,
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
        isOpen={isFabOpen}
        clickEvent={() => {
          if (isFabOpen) setIsShowingViewPicker(false);
          setIsFabOpen(!isFabOpen);
        }}
      >
        <RadialFabChild
          bgColor="#22C55E"
          borderColor="#16A34A"
          angle={(-80 * Math.PI) / 180}
          openMargin="5em"
          fineAdjustIconX="2%"
          fineAdjustIconY="2%"
          clickEvent={() => setIsShowingViewPicker(!isShowingViewPicker)}
        >
          <AddSVG className="text-white" />
        </RadialFabChild>
        <RadialFabChild
          bgColor={`${isLayoutLocked ? `#4B5563` : `#4F46E5`}`}
          borderColor={`${isLayoutLocked ? `#374151` : `#4338CA`}`}
          angle={(-135 * Math.PI) / 180}
          openMargin="5em"
          fineAdjustIconX="-2%"
          fineAdjustIconY="-3%"
          clickEvent={toggleLayoutLocked}
        >
          {isLayoutLocked ? <LockSVG /> : <LockOpenSVG />}
        </RadialFabChild>
        <RadialFabChild
          bgColor={`${isInDeleteMode ? '#F97316' : '#F59E0B'}`}
          borderColor={`${isInDeleteMode ? '#EA580C' : '#D97706'}`}
          angle={(170 * Math.PI) / 180}
          openMargin="5em"
          fineAdjustIconX="-2%"
          fineAdjustIconY="-2%"
          clickEvent={() => setIsInDeleteMode(!isInDeleteMode)}
        >
          {isInDeleteMode ? <DeleteXSVG /> : <DeleteSVG />}
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
