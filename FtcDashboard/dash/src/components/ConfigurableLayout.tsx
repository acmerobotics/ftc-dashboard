import React, {
  ReactElement,
  useState,
  useEffect,
  useRef,
  useReducer,
} from 'react';
import RGL, { WidthProvider, Layout } from 'react-grid-layout';
import { v4 as uuidv4 } from 'uuid';
import { isEqual } from 'lodash';

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
import { ReactComponent as DeleteXSVG } from '../assets/icons/delete_x.svg';
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

const GRID_COL = 6;

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

enum StateHistoryCommand {
  APPEND,
  UNDO,
  REDO,
}

type StateHistoryAction =
  | {
      type: StateHistoryCommand.APPEND;
      payload: GridItemType[];
    }
  | { type: StateHistoryCommand.UNDO }
  | { type: StateHistoryCommand.REDO };

interface StateHistoryReducerState {
  gridStateHistory: GridItemType[][];
  actionHistory: StateHistoryCommand[];
  currentHistoryPosition: number;
  currentHead: GridItemType[];
}

const stateHistoryReducer = (
  state: StateHistoryReducerState,
  action: StateHistoryAction,
): StateHistoryReducerState => {
  if (action.type === StateHistoryCommand.APPEND) {
    if (state.gridStateHistory.length !== 0) {
      if (
        isEqual(
          state.gridStateHistory[state.currentHistoryPosition],
          action.payload,
        )
      ) {
        return state;
      }

      const lastAction = state.actionHistory[state.actionHistory.length - 1];
      if (
        lastAction === StateHistoryCommand.UNDO ||
        lastAction === StateHistoryCommand.REDO
      ) {
        if (isEqual(state.currentHead, action.payload)) return state;
      }
    }

    const newGridStateHistory = [...state.gridStateHistory];

    if (state.currentHistoryPosition !== newGridStateHistory.length - 1) {
      newGridStateHistory.splice(
        state.currentHistoryPosition + 1,
        newGridStateHistory.length - state.currentHistoryPosition,
      );
    }

    newGridStateHistory.push(action.payload);
    const newActionHistory = [
      ...state.actionHistory,
      StateHistoryCommand.APPEND,
    ];
    const newCurrentHistoryPosition = state.currentHistoryPosition + 1;
    const newCurrentHead = newGridStateHistory[newCurrentHistoryPosition];

    return {
      gridStateHistory: newGridStateHistory,
      actionHistory: newActionHistory,
      currentHistoryPosition: newCurrentHistoryPosition,
      currentHead: newCurrentHead,
    };
  } else if (action.type === StateHistoryCommand.UNDO) {
    if (state.currentHistoryPosition > 0) {
      const newActionHistory = [
        ...state.actionHistory,
        StateHistoryCommand.UNDO,
      ];
      const newCurrentHistoryPosition = state.currentHistoryPosition - 1;
      const newCurrentHead = state.gridStateHistory[newCurrentHistoryPosition];

      return {
        gridStateHistory: state.gridStateHistory,
        actionHistory: newActionHistory,
        currentHistoryPosition: newCurrentHistoryPosition,
        currentHead: newCurrentHead,
      };
    }

    return { ...state };
  } else if (action.type === StateHistoryCommand.REDO) {
    if (state.currentHistoryPosition < state.gridStateHistory.length - 1) {
      const newActionHistory = [
        ...state.actionHistory,
        StateHistoryCommand.REDO,
      ];
      const newCurrentHistoryPosition = state.currentHistoryPosition + 1;
      const newCurrentHead = state.gridStateHistory[newCurrentHistoryPosition];

      return {
        gridStateHistory: state.gridStateHistory,
        actionHistory: newActionHistory,
        currentHistoryPosition: newCurrentHistoryPosition,
        currentHead: newCurrentHead,
      };
    }

    return { ...state };
  }

  return { ...state };
};

const ReactGridLayout = WidthProvider(RGL);

export default function ConfigurableLayout() {
  const containerRef = useRef<HTMLDivElement>(null);

  const [isLayoutLocked, setIsLayoutLocked] = useState(true);
  const [isInDeleteMode, setIsInDeleteMode] = useState(false);
  const [isShowingViewPicker, setIsShowingViewPicker] = useState(false);

  const [{ currentHead: gridItems }, dispatch] = useReducer(
    stateHistoryReducer,
    {
      gridStateHistory: [],
      actionHistory: [],
      currentHistoryPosition: -1,
      currentHead: [],
    },
  );

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
        // Solution then is to use something like useCallback similar to the useDelayedTooltip hook
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
    dispatch({ type: StateHistoryCommand.APPEND, payload: newGridItems });
  }, []);

  const undo = () => {
    dispatch({ type: StateHistoryCommand.UNDO });
  };

  const redo = () => {
    dispatch({ type: StateHistoryCommand.REDO });
  };

  useEffect(() => {
    const keyDownListener = (e: KeyboardEvent) => {
      if (!isLayoutLocked) {
        if (navigator.platform.indexOf('Mac') > -1) {
          if (e.metaKey && e.key === 'z') {
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
          } else {
            if (e.ctrlKey && e.key === 'z') {
              undo();
            } else if (e.ctrlKey && e.key === 'y') {
              redo();
            }
          }
        }
      }
    };

    document.addEventListener('keydown', keyDownListener);

    return () => {
      document.removeEventListener('keydown', keyDownListener);
    };
  }, [isLayoutLocked]);

  useEffect(() => {
    window.localStorage.setItem(
      LOCAL_STORAGE_LAYOUT_KEY,
      JSON.stringify([...gridItems]),
    );
  }, [gridItems]);

  const addItem = (item: ConfigurableView) => {
    const ITEM_WIDTH = 2;
    const ITEM_HEIGHT = 4;

    // [number] > [number]
    const moreThanNumberArray = (left: number[], right: number[]): boolean => {
      if (left.length === 0) return false;
      // Follows JS native comparison
      else if (right.length === 0) return true;
      // Follows JS native comparison
      else if (left[0] === right[0] && left.length > 1)
        return moreThanNumberArray(left.slice(1), right.slice(1));
      else return left[0] > right[0];
    };

    let [newItemBot, newItemLeft] = gridItems
      .map((e) => [e.layout.y + e.layout.h, e.layout.x + e.layout.w])
      .reduce((e, acc) => (moreThanNumberArray(e, acc) ? e : acc), [
        ITEM_HEIGHT,
        0,
      ]);

    if (newItemLeft >= GRID_COL) {
      // final row overflow
      newItemLeft = 0;
      newItemBot += ITEM_HEIGHT;
    }

    dispatch({
      type: StateHistoryCommand.APPEND,
      payload: [
        ...gridItems,
        {
          id: uuidv4(),
          view: item,
          layout: {
            x: newItemLeft,
            y: newItemBot - ITEM_HEIGHT,
            w: ITEM_WIDTH,
            h: ITEM_HEIGHT,
            isDraggable: !isLayoutLocked,
            isResizable: !isLayoutLocked,
          },
        },
      ],
    });
  };

  const removeItem = (id: string) => {
    dispatch({
      type: StateHistoryCommand.APPEND,
      payload: gridItems.filter((e) => e.id !== id),
    });
  };

  const onLayoutChange = (layout: Layout[]) => {
    const newGrid = gridItems.map((e) => {
      const newLayoutValue = layout.find((i) => i.i === e.id);
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
    });

    dispatch({ type: StateHistoryCommand.APPEND, payload: newGrid });
  };

  const clickFAB = () => {
    const toBeLocked = !isLayoutLocked;

    setIsLayoutLocked(toBeLocked);
    dispatch({
      type: StateHistoryCommand.APPEND,
      payload: gridItems.map((i) => {
        i.layout = {
          ...i.layout,
          isResizable: !toBeLocked,
          isDraggable: !toBeLocked,
        };
        return i;
      }),
    });

    if (toBeLocked) setIsShowingViewPicker(false);
  };

  return (
    <Container ref={containerRef} isLayoutLocked={isLayoutLocked}>
      {gridItems.length === 0 ? (
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
      <ReactGridLayout
        className="layout"
        cols={GRID_COL}
        resizeHandles={['se']}
        draggableHandle=".grab-handle"
        compactType={null}
        rowHeight={isLayoutLocked ? 70 : 60}
        layout={gridItems.map((item) => ({ i: item.id, ...item.layout }))}
        onLayoutChange={onLayoutChange}
        margin={isLayoutLocked ? [0, 0] : [10, 10]}
      >
        {gridItems.map((item) => (
          <div key={item.id}>
            {React.cloneElement(VIEW_MAP[item.view], {
              isDraggable: item.layout.isDraggable,
              isUnlocked: !isLayoutLocked,
            })}
            <div
              className={`absolute top-0 left-0 w-full h-full bg-yellow-300 bg-opacity-50 flex justify-center items-center rounded transition ${
                isInDeleteMode
                  ? 'pointer-events opacity-100'
                  : 'pointer-events-none opacity-0'
              }`}
            >
              <button
                className="p-4 border-4 border-yellow-600 rounded-full bg-opacity-50 opacity-50 focus:outline-none focus:ring focus:ring-yellow-800"
                onClick={() => {
                  removeItem(item.id);
                }}
              >
                <DeleteXSVG className="text-yellow-600 w-20 h-20" />
              </button>
            </div>
          </div>
        ))}
      </ReactGridLayout>
      <RadialFab
        width="4em"
        height="4em"
        bottom="2em"
        right="3.5em"
        isOpen={!isLayoutLocked}
        isShowing={!(isFabIdle && isLayoutLocked)}
        clickEvent={clickFAB}
        icon={!isLayoutLocked ? LockSVGURL : CreateSVGURL}
        customClassName={`${
          !isLayoutLocked
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
          clickEvent={() =>
            dispatch({ type: StateHistoryCommand.APPEND, payload: [] })
          }
        >
          <DeleteSweepSVG className="w-5 h-5" />
        </RadialFabChild>
      </RadialFab>
      <ViewPicker
        isOpen={isShowingViewPicker}
        bottom="13em"
        right="1.5em"
        clickEvent={addItem}
      />
    </Container>
  );
}
