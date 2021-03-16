import React from 'react';
import { Values } from '../typeHelpers';

import TileGrid from '../components/TileGrid';
import Tile from '../components/Tile';
import ConfigurableLayout from '../components/ConfigurableLayout';

import OpModeView from '../containers/OpModeView';
import CameraView from '../containers/CameraView';
import GraphView from '../containers/GraphView';
import ConfigView from '../containers/ConfigView';
import TelemetryView from '../containers/TelemetryView';
import FieldView from '../containers/FieldView';

const LayoutPreset = {
  DEFAULT: 'DEFAULT',
  FIELD: 'FIELD',
  GRAPH: 'GRAPH',
  ORIGINAL: 'ORIGINAL',
  CONFIGURABLE: 'CONFIGURABLE',
} as const;

type Layout = {
  name: string;
  content: JSX.Element;
};

const LAYOUT_DETAILS: { [key in Values<typeof LayoutPreset>]: Layout } = {
  [LayoutPreset.DEFAULT]: {
    name: 'Default',
    content: (
      <TileGrid gridTemplate="220px calc(60% - 220px) 40% / 30% 40% 30%">
        <Tile row="1 / span 1" col={1}>
          <OpModeView />
        </Tile>
        <Tile row="2 / span 2" col={1}>
          <CameraView />
        </Tile>
        <Tile row="1 / span 3" col={2}>
          <GraphView />
        </Tile>
        <Tile row="1 / span 2" col={3}>
          <ConfigView />
        </Tile>
        <Tile row={3} col={3}>
          <TelemetryView />
        </Tile>
      </TileGrid>
    ),
  },
  [LayoutPreset.FIELD]: {
    name: 'Field',
    content: (
      <TileGrid gridTemplate="220px calc(60% - 220px) 40% / 30% 40% 30%">
        <Tile row="1 / span 1" col={1}>
          <OpModeView />
        </Tile>
        <Tile row="2 / span 2" col={1}>
          <FieldView />
        </Tile>
        <Tile row="1 / span 3" col={2}>
          <GraphView />
        </Tile>
        <Tile row="1 / span 2" col={3}>
          <ConfigView />
        </Tile>
        <Tile row={3} col={3}>
          <TelemetryView />
        </Tile>
      </TileGrid>
    ),
  },
  [LayoutPreset.GRAPH]: {
    name: 'Graph',
    content: (
      <TileGrid gridTemplate="100% / 50% 50%">
        <Tile row={1} col={1}>
          <GraphView />
        </Tile>
        <Tile row={1} col={2}>
          <GraphView />
        </Tile>
      </TileGrid>
    ),
  },
  [LayoutPreset.ORIGINAL]: {
    name: 'Original',
    content: (
      <TileGrid gridTemplate="60% 40% / 65% 35%">
        <Tile row="1 / span 2" col={1}>
          <GraphView />
        </Tile>
        <Tile row={1} col={2}>
          <ConfigView />
        </Tile>
        <Tile row={2} col={2}>
          <TelemetryView />
        </Tile>
      </TileGrid>
    ),
  },
  [LayoutPreset.CONFIGURABLE]: {
    name: 'Custom',
    content: <ConfigurableLayout />,
  },
};

export default Object.freeze({
  ...LayoutPreset,

  getName: (preset: Values<typeof LayoutPreset>) => LAYOUT_DETAILS[preset].name,

  getContent: (preset: Values<typeof LayoutPreset>) =>
    LAYOUT_DETAILS[preset]?.content ??
    LAYOUT_DETAILS[LayoutPreset.DEFAULT].content,
});

export type LayoutPresetType = Values<typeof LayoutPreset>;
