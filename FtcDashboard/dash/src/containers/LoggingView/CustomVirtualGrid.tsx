import { useState, useEffect, useRef } from 'react';

import {
  GridChildComponentProps,
  GridOnScrollProps,
  VariableSizeGrid as Grid,
} from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { DraggableCore } from 'react-draggable';

type Props = {
  header: string[];
  data: unknown[];
};

type CellProps = GridChildComponentProps & { data: unknown };

const Cell = ({ columnIndex, rowIndex, style, data }: CellProps) => {
  return (
    <div
      className={`truncate ${columnIndex === 0 ? 'text-gray-400' : ''}`}
      style={style}
    >
      {data[rowIndex][columnIndex]}
    </div>
  );
};

const DEFAULT_COL_WIDTH = 150;
const COL_MIN_WIDTH = 50;

const ROW_HEIGHT = 30;

const CustomVirtualGrid = ({ header, data }: Props) => {
  const [colWidth, setColWidth] = useState<number[]>([]);
  const [headerOffset, setHeaderOffset] = useState(0);

  const gridRef = useRef<Grid>(null);

  useEffect(() => {
    setColWidth(new Array(header.length).fill(DEFAULT_COL_WIDTH));
  }, [header.length]);

  const resizeCol = (key: string, deltaX: number) => {
    const index = header.indexOf(key);

    if (index === -1) return;

    // if (deltaX < 0) {
    // setColWidth([
    //   ...colWidth.slice(0, index + 1).map((e) => e + deltaX),
    //   ...colWidth.slice(index - 1),
    // ]);
    // }
    // if (deltaX > 1) {
    // }
    const colCopy = [...colWidth];
    colCopy[index] += deltaX;
    colCopy[index] = Math.max(COL_MIN_WIDTH, colCopy[index]);

    setColWidth(colCopy);
    gridRef.current?.resetAfterColumnIndex(index);
  };

  const onScroll = ({ scrollLeft }: GridOnScrollProps) => {
    setHeaderOffset(scrollLeft);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-x-hidden">
      <div
        className="mb-1"
        style={{
          width: (colWidth.length === 0 ? [0] : colWidth).reduce(
            (prev, acc) => prev + acc,
          ),
          transform: `translateX(${-headerOffset}px)`,
        }}
      >
        {header.map((e, i) => (
          <div
            key={e}
            className="inline-flex flex-row"
            style={{ width: colWidth[i], minWidth: '3em' }}
          >
            <span className="font-semibold flex-grow">{e}</span>
            <DraggableCore onDrag={(_, { deltaX }) => resizeCol(e, deltaX)}>
              <div className="cursor-col-resize hover:bg-gray-200 px-2 mr-2 rounded transition-colors">
                ⋮
              </div>
            </DraggableCore>
          </div>
        ))}
      </div>
      <div className="flex-grow">
        <AutoSizer>
          {({ height, width }) => (
            <Grid
              ref={gridRef}
              columnCount={header.length}
              columnWidth={(i) => colWidth[i]}
              height={height}
              rowCount={data.length}
              rowHeight={() => ROW_HEIGHT}
              width={width}
              itemData={data}
              onScroll={onScroll}
            >
              {Cell}
            </Grid>
          )}
        </AutoSizer>
      </div>
    </div>
  );
};

export default CustomVirtualGrid;
