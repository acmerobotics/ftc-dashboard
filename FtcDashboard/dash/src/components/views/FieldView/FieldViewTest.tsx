import React from 'react';
import Field from './Field';
import IronReignField from './IronReignField';
import { DrawOp } from '@/store/types/telemetry';

const FieldView: React.FC<{ ops: DrawOp[]; ironReign: boolean }> = ({
  ops,
  ironReign,
}) => {
  return (
    <canvas
      ref={(canvas) => {
        if (canvas === null) {
          return;
        }

        const field = new (ironReign ? IronReignField : Field)(canvas);
        field.setOverlay({ ops });
        field.render();
      }}
      width={300}
      height={300}
    ></canvas>
  );
};

function fieldAxes(x: number, y: number): DrawOp[] {
  return [
    { type: 'stroke', color: 'red' },
    { type: 'polyline', xPoints: [x, x + 12], yPoints: [y, y] },
    { type: 'stroke', color: 'green' },
    { type: 'polyline', xPoints: [x, x], yPoints: [y, y + 12] },
  ];
}

function pageAxes(x: number, y: number): DrawOp[] {
  const fieldX = 72 - y;
  const fieldY = 72 - x;
  return [
    { type: 'stroke', color: 'red' },
    {
      type: 'polyline',
      xPoints: [fieldX, fieldX],
      yPoints: [fieldY, fieldY - 12],
    },
    { type: 'stroke', color: 'green' },
    {
      type: 'polyline',
      xPoints: [fieldX, fieldX - 12],
      yPoints: [fieldY, fieldY],
    },
  ];
}

const OUTLINE: DrawOp = {
  type: 'grid',
  x: 0,
  y: 0,
  width: 144,
  height: 144,
  numTicksX: 2,
  numTicksY: 2,
  theta: 0,
  pivotX: 0,
  pivotY: 0,
  usePageFrame: true,
};
const PRELUDE: DrawOp[] = [
  {
    type: 'grid',
    x: 0,
    y: 0,
    width: 144,
    height: 144,
    numTicksX: 7,
    numTicksY: 7,
    theta: 0,
    pivotX: 0,
    pivotY: 0,
    usePageFrame: true,
  },
];

const IMAGE_PATH =
  'https://www.firstinspires.org/sites/default/files/uploads/resource_library/brand/thumbnails/FTC-Vertical.png';

const TEST_CASES: DrawOp[][] = [
  // grids
  [
    OUTLINE,
    {
      type: 'grid',
      x: 24,
      y: 24,
      width: 72,
      height: 72,
      numTicksX: 3,
      numTicksY: 4,
      theta: 0,
      pivotX: 0,
      pivotY: 0,
      usePageFrame: true,
    },
  ],
  [
    OUTLINE,
    {
      type: 'grid',
      x: 24,
      y: 24,
      width: 72,
      height: 72,
      numTicksX: 3,
      numTicksY: 4,
      theta: Math.PI / 6,
      pivotX: 0,
      pivotY: 0,
      usePageFrame: true,
    },
  ],
  [
    OUTLINE,
    {
      type: 'grid',
      x: 24,
      y: 24,
      width: 72,
      height: 72,
      numTicksX: 3,
      numTicksY: 4,
      theta: Math.PI / 6,
      pivotX: 36,
      pivotY: 36,
      usePageFrame: true,
    },
    { type: 'fill', color: 'goldenrod' },
    {
      type: 'circle',
      x: 12,
      y: 12,
      /* (24 + 36, 24 + 36) page frame */ radius: 3,
      stroke: false,
    },
  ],
  [
    OUTLINE,
    {
      type: 'grid',
      x: 24,
      y: 24,
      width: 72,
      height: 72,
      numTicksX: 3,
      numTicksY: 4,
      theta: 0,
      pivotX: 0,
      pivotY: 0,
      usePageFrame: false,
    },
    ...fieldAxes(24, 24),
  ],
  [
    OUTLINE,
    {
      type: 'grid',
      x: 24,
      y: 24,
      width: 72,
      height: 72,
      numTicksX: 3,
      numTicksY: 4,
      theta: Math.PI / 6,
      pivotX: 0,
      pivotY: 0,
      usePageFrame: false,
    },
    { type: 'fill', color: 'goldenrod' },
    { type: 'circle', x: 24, y: 24, radius: 3, stroke: false },
  ],
  // images
  [
    ...PRELUDE,
    {
      type: 'image',
      x: 24,
      y: 24,
      width: 72,
      height: 72,
      path: IMAGE_PATH,
      theta: 0,
      pivotX: 0,
      pivotY: 0,
      usePageFrame: true,
    },
  ],
  [
    ...PRELUDE,
    {
      type: 'image',
      x: 24,
      y: 24,
      width: 72,
      height: 72,
      path: IMAGE_PATH,
      theta: Math.PI / 6,
      pivotX: 0,
      pivotY: 0,
      usePageFrame: true,
    },
  ],
  [
    ...PRELUDE,
    {
      type: 'image',
      x: 24,
      y: 24,
      width: 72,
      height: 72,
      path: IMAGE_PATH,
      theta: Math.PI / 6,
      pivotX: 36,
      pivotY: 36,
      usePageFrame: true,
    },
  ],
  [
    ...PRELUDE,
    { type: 'alpha', alpha: 0.25 },
    { type: 'fill', color: 'darkorchid' },
    {
      type: 'polygon',
      xPoints: [24, 96, 96, 24],
      yPoints: [24, 24, 96, 96],
      stroke: false,
    },
    { type: 'alpha', alpha: 1 },
    {
      type: 'image',
      x: 24,
      y: 24,
      width: 72,
      height: 72,
      path: IMAGE_PATH,
      theta: 0,
      pivotX: 0,
      pivotY: 0,
      usePageFrame: false,
    },
    ...fieldAxes(24, 24),
  ],
  [
    ...PRELUDE,
    {
      type: 'image',
      x: 24,
      y: 24,
      width: 72,
      height: 72,
      path: IMAGE_PATH,
      theta: Math.PI / 6,
      pivotX: 0,
      pivotY: 0,
      usePageFrame: false,
    },
  ],
  // [
  //   ...PRELUDE,
  //   {type: "image", x: 24, y: 24, width: 72, height: 72, path: IMAGE_PATH, theta: Math.PI / 6, pivotX: 36, pivotY: 36, usePageFrame: false},
  //   {type: "fill", color: "goldenrod"},
  //   {type: "circle", x: 24, y: 24, radius: 3, stroke: false},
  // ],
  // text
  [
    ...PRELUDE,
    {
      type: 'text',
      text: 'Hello, world!',
      x: 24,
      y: 24,
      font: 'Arial',
      stroke: false,
      usePageFrame: true,
      theta: Math.PI / 6,
    },
    ...pageAxes(24, 24),
  ],
  [
    ...PRELUDE,
    { type: 'alpha', alpha: 0.25 },
    { type: 'fill', color: 'darkorchid' },
    {
      type: 'polygon',
      xPoints: [24, 84, 84, 24],
      yPoints: [24, 24, 12, 12],
      stroke: false,
    },
    { type: 'alpha', alpha: 1 },
    { type: 'fill', color: 'black' },
    {
      type: 'text',
      text: 'Hello, world!',
      x: 24,
      y: 24,
      font: 'Arial',
      stroke: false,
      usePageFrame: false,
      theta: 0,
    },
    ...fieldAxes(24, 24),
  ],
  [
    ...PRELUDE,
    {
      type: 'text',
      text: 'Hello, world!',
      x: 24,
      y: 24,
      font: 'Arial',
      stroke: false,
      usePageFrame: false,
      theta: Math.PI / 6,
    },
    ...fieldAxes(24, 24),
  ],
];

const FieldViewTest: React.FC = () => {
  return (
    <>
      <h1 className="text-2xl font-medium">FieldView Test</h1>
      {TEST_CASES.map((ops, i) => (
        <div key={i}>
          <h2 className="text-lg font-medium">Exhibit 0-{i}</h2>
          <p className="font-mono text-sm">{JSON.stringify(ops)}</p>
          <div className="flex">
            <FieldView ops={ops} ironReign={false} />
            <FieldView ops={ops} ironReign={true} />
          </div>
        </div>
      ))}
    </>
  );
};

export default FieldViewTest;
