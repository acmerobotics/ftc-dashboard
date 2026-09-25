import React, { Component } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import BaseView, {
  BaseViewHeading,
  BaseViewBody,
  BaseViewIcons,
  BaseViewIconButton,
  BaseViewProps,
  BaseViewHeadingProps,
} from '@/components/views/BaseView';
import MultipleCheckbox from './MultipleCheckbox';
import GraphCanvas from './GraphCanvas';
import GraphSeriesList from './GraphSeriesList';
import TextInput from '@/components/views/ConfigView/inputs/TextInput';

import { ReactComponent as ChartIcon } from '@/assets/icons/chart.svg';
import { ReactComponent as CloseIcon } from '@/assets/icons/close.svg';
import { ReactComponent as PlayIcon } from '@/assets/icons/play_arrow.svg';
import { ReactComponent as PauseIcon } from '@/assets/icons/pause.svg';
import { ReactComponent as PaletteIcon } from '@/assets/icons/palette.svg';

import { RootState } from '@/store/reducers';
import { STOP_OP_MODE_TAG } from '@/store/types';
import { OpModeStatus } from '@/enums/OpModeStatus';
import { colors, ThemeConsumer } from '@/hooks/useTheme';
import { DEFAULT_OPTIONS } from './Graph';
import { pickDefaultColor, sameColor } from './colors';
import { validateInt, ValResult } from '@/components/inputs/validation';

type GraphViewState = {
  graphing: boolean;
  opmodePaused: boolean;
  userPaused: boolean;
  pausedTime: number;
  availableKeys: string[];
  // selection doubles as the layer order: the first key is drawn in front
  selectedKeys: string[];
  // colors are remembered per key, including for keys that are unchecked and
  // later re-checked; a Map because keys like 'constructor' come from the robot
  keyColors: ReadonlyMap<string, string>;
  showSeriesSettings: boolean;
  windowMs: ValResult<number>;
};

const mapStateToProps = (state: RootState) => ({
  telemetry: state.telemetry,
  status: state.status,
});

const connector = connect(mapStateToProps);

type GraphViewProps = ConnectedProps<typeof connector> &
  BaseViewProps &
  BaseViewHeadingProps;

class GraphView extends Component<GraphViewProps, GraphViewState> {
  containerRef: React.RefObject<HTMLDivElement>;

  constructor(props: GraphViewProps) {
    super(props);

    this.state = {
      graphing: false,
      opmodePaused: false,
      userPaused: false,
      pausedTime: 0,
      availableKeys: [],
      selectedKeys: [],
      keyColors: new Map(),
      showSeriesSettings: false,
      windowMs: {
        value: DEFAULT_OPTIONS.windowMs,
        valid: true,
      },
    };

    this.containerRef = React.createRef();

    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);

    this.userPlay = this.userPlay.bind(this);
    this.userPause = this.userPause.bind(this);

    this.handleSelectionChange = this.handleSelectionChange.bind(this);
    this.handleReorder = this.handleReorder.bind(this);
    this.handleColorChange = this.handleColorChange.bind(this);
    this.handleColorReset = this.handleColorReset.bind(this);

    this.keepFocusOnView = this.keepFocusOnView.bind(this);
    this.handleDocumentKeydown = this.handleDocumentKeydown.bind(this);
  }

  // Keep focus on the view, or Space after clicking "Start Graphing" would
  // activate that button and stop graphing instead of toggling pause.
  keepFocusOnView(evt: React.MouseEvent) {
    evt.preventDefault();
    // Scrolling the tile into view would move the button from under the
    // pointer and lose the click.
    this.containerRef.current?.focus({ preventScroll: true });
  }

  componentDidMount() {
    if (this.containerRef.current) {
      this.containerRef.current.addEventListener(
        'keydown',
        this.handleDocumentKeydown,
      );
    }
  }

  componentWillUnmount() {
    if (this.containerRef.current) {
      this.containerRef.current.removeEventListener(
        'keydown',
        this.handleDocumentKeydown,
      );
    }
  }

  componentDidUpdate(prevProps: GraphViewProps) {
    if (this.noOpmodeRunning(this.props) && !this.noOpmodeRunning(prevProps)) {
      this.opmodePause();
    }
    if (!this.noOpmodeRunning(this.props) && this.noOpmodeRunning(prevProps)) {
      this.opmodePlay();
    }

    if (this.props.telemetry === prevProps.telemetry) return;

    this.setState((state) => {
      if (this.props.telemetry.length === 0) {
        return { availableKeys: [], selectedKeys: state.selectedKeys };
      }

      const availableKeys = [...state.availableKeys];
      for (const { data } of this.props.telemetry) {
        for (const k of Object.keys(data)) {
          if (isNaN(parseFloat(data[k]))) continue;

          if (availableKeys.includes(k)) continue;

          availableKeys.push(k);
        }
      }

      return {
        availableKeys,
        selectedKeys: state.selectedKeys,
      };
    });
  }

  handleSelectionChange(selectedKeys: string[]) {
    this.setState((state) => {
      const keyColors = new Map(state.keyColors);

      // Only arriving keys need a color picked; only theirs can collide.
      const staying = selectedKeys.filter((key) =>
        state.selectedKeys.includes(key),
      );
      const arriving = selectedKeys.filter(
        (key) => !state.selectedKeys.includes(key),
      );

      const used = staying
        .map((key) => keyColors.get(key))
        .filter((color): color is string => color !== undefined);

      for (const key of arriving) {
        // A returning key keeps its old color unless another line took it.
        const remembered = keyColors.get(key);
        const color =
          remembered !== undefined &&
          !used.some((taken) => sameColor(taken, remembered))
            ? remembered
            : pickDefaultColor(used);

        keyColors.set(key, color);
        used.push(color);
      }

      return { selectedKeys, keyColors };
    });
  }

  // Only the shown keys move; absent ones keep their slots in the selection.
  handleReorder(shownKeys: string[]) {
    this.setState((state) => {
      let next = 0;
      return {
        selectedKeys: state.selectedKeys.map((key) =>
          shownKeys.includes(key) ? shownKeys[next++] : key,
        ),
      };
    });
  }

  handleColorChange(key: string, color: string) {
    this.setState((state) => ({
      keyColors: new Map(state.keyColors).set(key, color),
    }));
  }

  handleColorReset(key: string) {
    this.setState((state) => {
      const used = state.selectedKeys
        .filter((k) => k !== key)
        .map((k) => state.keyColors.get(k))
        .filter((color): color is string => color !== undefined);

      return {
        keyColors: new Map(state.keyColors).set(key, pickDefaultColor(used)),
      };
    });
  }

  handleDocumentKeydown(evt: KeyboardEvent) {
    // Leave keystrokes aimed at fields and buttons alone.
    const target = evt.target as HTMLElement | null;
    if (target?.closest?.('input, textarea, select, [contenteditable="true"]'))
      return;
    if (evt.code === 'Space' && target?.closest?.('button')) return;

    if (evt.code === 'Space' || evt.key === 'k') {
      // The pause button's handlers leave pausedTime alone when already frozen,
      // so the frame does not jump on the next repaint.
      if (this.state.userPaused) this.userPlay();
      else this.userPause();
    }
  }

  noOpmodeRunning(props: GraphViewProps) {
    return (
      props.status.opModeInfoList?.length === 0 ||
      props.status.activeOpMode === STOP_OP_MODE_TAG ||
      props.status.activeOpModeStatus === OpModeStatus.STOPPED
    );
  }

  start() {
    this.setState({
      ...this.state,
      graphing: true,
      userPaused: false,
    });
  }

  stop() {
    this.setState({
      ...this.state,
      graphing: false,
    });
  }

  userPause() {
    this.setState({
      ...this.state,
      userPaused: true,
      pausedTime:
        this.state.userPaused || this.state.opmodePaused
          ? this.state.pausedTime
          : Date.now(),
    });
  }

  opmodePause() {
    this.setState({
      ...this.state,
      opmodePaused: true,
      pausedTime:
        this.state.userPaused || this.state.opmodePaused
          ? this.state.pausedTime
          : Date.now(),
    });
  }

  userPlay() {
    this.setState({
      ...this.state,
      userPaused: false,
    });
  }

  opmodePlay() {
    this.setState({
      ...this.state,
      opmodePaused: false,
    });
  }

  // Keys the current op mode is not sending stay selected, so they come back
  // checked when it sends them again, but have no line to edit until then.
  // Every op mode init and telemetry.clear() empties availableKeys, so until
  // the next packet the selection stands in for it.
  shownKeys() {
    const { selectedKeys, availableKeys } = this.state;
    if (availableKeys.length === 0) return selectedKeys;
    return selectedKeys.filter((key) => availableKeys.includes(key));
  }

  renderSeriesList(
    shownKeys: string[],
    seriesColors: { [key: string]: string },
  ) {
    return (
      <>
        <GraphSeriesList
          seriesKeys={shownKeys}
          colors={seriesColors}
          onReorder={this.handleReorder}
          onColorChange={this.handleColorChange}
          onColorReset={this.handleColorReset}
        />
        {shownKeys.length > 1 && (
          <p className="mt-1 text-sm opacity-60">
            The first line is drawn in front of the others.
          </p>
        )}
      </>
    );
  }

  // colors of the graphed keys only; the rest are remembered but unused
  seriesColors() {
    return Object.fromEntries(
      [...this.state.keyColors].filter(([key]) =>
        this.state.selectedKeys.includes(key),
      ),
    );
  }

  render() {
    const showNoNumeric =
      !this.state.graphing && this.state.availableKeys.length === 0;
    const showEmpty =
      this.state.graphing && this.state.selectedKeys.length === 0;
    const showText = showNoNumeric || showEmpty;

    const graphData = this.props.telemetry.map((packet) => [
      {
        name: 'time',
        value: packet.timestamp,
      },
      ...Object.keys(packet.data)
        .filter((key) => this.state.selectedKeys.includes(key))
        .map((key) => {
          return {
            name: key,
            value: parseFloat(packet.data[key]),
          };
        }),
    ]);

    const shownKeys = this.shownKeys();
    const seriesColors = this.seriesColors();

    return (
      <BaseView
        className="flex flex-col overflow-auto"
        isUnlocked={this.props.isUnlocked}
        ref={this.containerRef}
        tabIndex={0}
      >
        <div className="flex">
          <BaseViewHeading isDraggable={this.props.isDraggable}>
            Graph
          </BaseViewHeading>
          <BaseViewIcons>
            {this.state.graphing && shownKeys.length !== 0 && (
              <BaseViewIconButton
                title={
                  this.state.showSeriesSettings
                    ? 'Hide Line Settings'
                    : 'Show Line Settings'
                }
                className="icon-btn h-8 w-8"
                onMouseDown={this.keepFocusOnView}
                onClick={() =>
                  this.setState((state) => ({
                    showSeriesSettings: !state.showSeriesSettings,
                  }))
                }
              >
                <PaletteIcon className="h-5 w-5" viewBox="0 0 50 50" />
              </BaseViewIconButton>
            )}

            {this.state.graphing && this.state.selectedKeys.length !== 0 && (
              <BaseViewIconButton
                title={
                  this.state.userPaused
                    ? 'Resume Graphing'
                    : this.noOpmodeRunning(this.props)
                    ? 'Graphing will restart when an OpMode starts'
                    : 'Pause Graphing'
                }
                className="icon-btn h-8 w-8"
                onMouseDown={this.keepFocusOnView}
                // on the button rather than the icon so that Space and Enter
                // activate it like any other button
                onClick={this.state.userPaused ? this.userPlay : this.userPause}
              >
                {this.state.userPaused ? (
                  <PlayIcon className="h-6 w-6" />
                ) : (
                  <PauseIcon className="h-6 w-6" />
                )}
              </BaseViewIconButton>
            )}

            <BaseViewIconButton
              title={this.state.graphing ? 'Stop Graphing' : 'Start Graphing'}
              onMouseDown={this.keepFocusOnView}
              onClick={this.state.graphing ? this.stop : this.start}
            >
              {this.state.graphing ? (
                <CloseIcon className="h-6 w-6" />
              ) : (
                <ChartIcon className="h-6 w-6" />
              )}
            </BaseViewIconButton>
          </BaseViewIcons>
        </div>
        <BaseViewBody className={showText ? 'flex-center' : ''}>
          {!this.state.graphing ? (
            showNoNumeric ? (
              <p className="justify-self-center text-center">
                Send number-valued telemetry data to graph them over time
              </p>
            ) : (
              <>
                <p className="my-2 text-center">
                  Press the upper-right button to graph selected keys over time
                </p>
                <h3 className="mt-6 font-medium">Telemetry to graph:</h3>
                <div className="ml-3">
                  <MultipleCheckbox
                    arr={this.state.availableKeys}
                    onChange={this.handleSelectionChange}
                    selected={this.state.selectedKeys}
                  />
                </div>
                {shownKeys.length !== 0 && (
                  <div className="mt-4">
                    <h3 className="font-medium">Lines:</h3>
                    <div className="ml-3">
                      {this.renderSeriesList(shownKeys, seriesColors)}
                    </div>
                  </div>
                )}
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Options:</h3>
                  </div>
                  <div className="ml-3">
                    <table>
                      <tbody>
                        <tr>
                          <td>Window (ms)</td>
                          <td>
                            <TextInput
                              value={this.state.windowMs.value}
                              valid={this.state.windowMs.valid}
                              validate={validateInt}
                              onChange={(arg) =>
                                this.setState({
                                  windowMs: arg,
                                })
                              }
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )
          ) : showEmpty ? (
            <p className="justify-self-center text-center">
              No telemetry selected to graph
            </p>
          ) : (
            <div className="relative h-full">
              <ThemeConsumer>
                {({ isDarkMode }) => (
                  <GraphCanvas
                    data={graphData}
                    options={{
                      windowMs: this.state.windowMs.valid
                        ? this.state.windowMs.value
                        : DEFAULT_OPTIONS.windowMs,
                      seriesOrder: this.state.selectedKeys,
                      seriesColors,
                      gridLineColor: isDarkMode
                        ? colors.slate[500]
                        : colors.gray[300],
                      textColor: isDarkMode
                        ? colors.slate[100]
                        : colors.gray[900],
                    }}
                    paused={this.state.userPaused || this.state.opmodePaused}
                    pausedTime={this.state.pausedTime}
                  />
                )}
              </ThemeConsumer>
              {/* anchored to the top rather than full-bleed so the lines it
                  restyles stay visible underneath */}
              {this.state.showSeriesSettings && shownKeys.length !== 0 && (
                <div className="absolute inset-x-0 top-0 max-h-full overflow-auto rounded border border-gray-200 bg-white p-3 shadow-md dark:border-slate-600 dark:bg-slate-900">
                  <h3 className="font-medium">Lines:</h3>
                  <div className="ml-3">
                    {this.renderSeriesList(shownKeys, seriesColors)}
                  </div>
                </div>
              )}
            </div>
          )}
        </BaseViewBody>
      </BaseView>
    );
  }
}

export default connector(GraphView);
