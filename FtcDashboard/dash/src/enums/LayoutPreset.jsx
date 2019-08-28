import React from 'react';
import TileGrid from '../components/TileGrid';
import Tile from '../components/Tile';
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
};

const LAYOUT_DETAILS = {
  [LayoutPreset.DEFAULT]: {
    name: 'Default',
    content: (
      <TileGrid gridTemplate="150px calc(60% - 150px) 40% / 30% 40% 30%">
        <Tile row={1} col={1}>
          <OpModeView />
        </Tile>
        <Tile row="2 / span 2" col={1}>
          <CameraView />
        </Tile>
        <Tile row="1 / span 3" col={2}>
          <GraphView />
        </Tile>=
        <Tile row="1 / span 2" col={3}>
          <ConfigView />
        </Tile>
        <Tile row={3} col={3}>
          <TelemetryView />
        </Tile>
      </TileGrid>
    )
  },
  [LayoutPreset.FIELD]: {
    name: 'Field',
    content: (
      <TileGrid gridTemplate="150px calc(60% - 150px) 40% / 30% 40% 30%">
        <Tile row={1} col={1}>
          <OpModeView />
        </Tile>
        <Tile row="2 / span 2" col={1}>
          <FieldView />
        </Tile>
        <Tile row="1 / span 3" col={2}>
          <GraphView />
        </Tile>=
        <Tile row="1 / span 2" col={3}>
          <ConfigView />
        </Tile>
        <Tile row={3} col={3}>
          <TelemetryView />
        </Tile>
      </TileGrid>
    )
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
    )
  },
  [LayoutPreset.ORIGINAL]: {
    name: 'Original',
    content: (
      <TileGrid gridTemplate="60% 40% / 65% 35%">
        <Tile row="1 / span 2" col={1}>
          <GraphView />
        </Tile>=
        <Tile row={1} col={2}>
          <ConfigView />
        </Tile>
        <Tile row={2} col={2}>
          <TelemetryView />
        </Tile>
      </TileGrid>
    )
  }
};

export default Object.freeze({
  ...LayoutPreset,
  
  getName: (preset) => LAYOUT_DETAILS[preset].name,

  getContent: (preset) => LAYOUT_DETAILS[preset].content
});
