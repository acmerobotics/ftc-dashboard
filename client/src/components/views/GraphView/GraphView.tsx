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
import TextInput from '@/components/views/ConfigView/inputs/TextInput';

import { ReactComponent as ChartIcon } from '@/assets/icons/chart.svg';
import { ReactComponent as CloseIcon } from '@/assets/icons/close.svg';
import { ReactComponent as PlayIcon } from '@/assets/icons/play_arrow.svg';
import { ReactComponent as PauseIcon } from '@/assets/icons/pause.svg';
import { ReactComponent as FullscreenIcon } from '@/assets/icons/fullscreen.svg';
import { ReactComponent as FullscreenExitIcon } from '@/assets/icons/fullscreen_exit.svg';

import { RootState } from '@/store/reducers';
import { STOP_OP_MODE_TAG } from '@/store/types';
import { OpModeStatus } from '@/enums/OpModeStatus';
import { colors, ThemeConsumer } from '@/hooks/useTheme';
import { DEFAULT_OPTIONS } from './Graph';
import { validateInt, ValResult } from '@/components/inputs/validation';

// a window of zero or less has no meaning and divides by zero when plotting
const validateWindowMs = (raw: string): ValResult<number> => {
  const result = validateInt(raw);

  return result.valid && result.value <= 0
    ? { value: raw, valid: false }
    : result;
};

type TimeBounds = {
  minMs: number;
  maxMs: number;
};

// Safari before 16.4 only exposes the webkit-prefixed Fullscreen API
type FullscreenDocument = {
  fullscreenElement?: Element | null;
  exitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FullscreenElement = {
  requestFullscreen?: () => Promise<void> | void;
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type GraphViewState = {
  graphing: boolean;
  opmodePaused: boolean;
  userPaused: boolean;
  pausedTime: number;
  availableKeys: string[];
  selectedKeys: string[];
  windowMs: ValResult<number>;
  // telemetry time shown at the right edge while scrubbing; null follows live data
  scrubMs: number | null;
  // telemetry time the frozen plot is actually showing at its right edge
  shownMs: number | null;
  timeBounds: TimeBounds | null;
  // bumped to clear the recorded history when a new op mode run begins
  runId: number;
  isFullscreen: boolean;
  // replaying the recorded history forward in real time, cursor and all
  playing: boolean;
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

  playFrameId: number | null = null;
  lastPlayFrameMs = 0;

  graphDataCache: {
    telemetry: GraphViewProps['telemetry'];
    selectedKeys: string[];
    data: { name: string; value: number }[][];
  } | null = null;

  constructor(props: GraphViewProps) {
    super(props);

    this.state = {
      graphing: false,
      opmodePaused: false,
      userPaused: false,
      pausedTime: 0,
      availableKeys: [],
      selectedKeys: [],
      windowMs: {
        value: DEFAULT_OPTIONS.windowMs,
        valid: true,
      },
      scrubMs: null,
      shownMs: null,
      timeBounds: null,
      runId: 0,
      isFullscreen: false,
      playing: false,
    };

    this.containerRef = React.createRef();

    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);

    this.userPlay = this.userPlay.bind(this);
    this.userPause = this.userPause.bind(this);

    this.handleDocumentKeydown = this.handleDocumentKeydown.bind(this);
    this.handleFullscreenChange = this.handleFullscreenChange.bind(this);
    this.toggleFullscreen = this.toggleFullscreen.bind(this);
    this.onTimeBounds = this.onTimeBounds.bind(this);
    this.onShownTime = this.onShownTime.bind(this);
    this.goLive = this.goLive.bind(this);

    this.togglePlayback = this.togglePlayback.bind(this);
    this.startReplay = this.startReplay.bind(this);
    this.pauseReplay = this.pauseReplay.bind(this);
    this.playTick = this.playTick.bind(this);
  }

  componentDidMount() {
    if (this.containerRef.current) {
      this.containerRef.current.addEventListener(
        'keydown',
        this.handleDocumentKeydown,
      );
    }

    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    document.addEventListener(
      'webkitfullscreenchange',
      this.handleFullscreenChange,
    );
  }

  componentWillUnmount() {
    if (this.containerRef.current) {
      this.containerRef.current.removeEventListener(
        'keydown',
        this.handleDocumentKeydown,
      );
    }

    document.removeEventListener(
      'fullscreenchange',
      this.handleFullscreenChange,
    );
    document.removeEventListener(
      'webkitfullscreenchange',
      this.handleFullscreenChange,
    );

    this.cancelPlayback();
  }

  componentDidUpdate(prevProps: GraphViewProps) {
    if (this.noOpmodeRunning(this.props) && !this.noOpmodeRunning(prevProps)) {
      this.opmodePause();
    }
    if (!this.noOpmodeRunning(this.props) && this.noOpmodeRunning(prevProps)) {
      this.opmodePlay();
    }

    if (this.opmodeRunStarted(this.props, prevProps)) this.resetHistory();

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

  handleDocumentKeydown(evt: KeyboardEvent) {
    if (!this.state.graphing) return;

    // text-like fields keep their own keys; the slider and buttons do not
    const target = evt.target as HTMLElement | null;
    const tagName = target?.tagName;
    if (
      tagName === 'TEXTAREA' ||
      tagName === 'SELECT' ||
      (tagName === 'INPUT' && (target as HTMLInputElement).type !== 'range')
    ) {
      return;
    }

    if (tagName === 'BUTTON' && (evt.code === 'Space' || evt.key === 'Enter')) {
      return;
    }

    if (evt.code === 'Space' || evt.key === 'k') {
      evt.preventDefault();
      this.togglePlayback();
    } else if (evt.key === 'ArrowLeft' || evt.key === 'ArrowRight') {
      evt.preventDefault();

      const windowMs = this.effectiveWindowMs();
      const step = windowMs * (evt.shiftKey ? 1 : 0.1);
      this.scrubBy(evt.key === 'ArrowLeft' ? -step : step);
    } else if (evt.key === 'Home') {
      evt.preventDefault();
      this.scrubTo(this.getScrubRange()?.min ?? null);
    } else if (evt.key === 'End') {
      evt.preventDefault();
      this.goLive();
    } else if (
      evt.key === 'Escape' &&
      this.state.scrubMs !== null &&
      !this.state.isFullscreen
    ) {
      // in fullscreen the browser claims Escape for exiting
      this.goLive();
    }
  }

  handleFullscreenChange() {
    this.setState({
      isFullscreen: this.fullscreenElement() === this.containerRef.current,
    });
  }

  fullscreenElement() {
    const doc = document as unknown as FullscreenDocument;

    return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
  }

  toggleFullscreen() {
    const doc = document as unknown as FullscreenDocument;
    const el = this.containerRef.current as unknown as FullscreenElement | null;

    const toggle =
      this.fullscreenElement() === this.containerRef.current
        ? (doc.exitFullscreen ?? doc.webkitExitFullscreen)?.bind(doc)
        : (el?.requestFullscreen ?? el?.webkitRequestFullscreen)?.bind(el);

    Promise.resolve(toggle?.()).catch(() => {
      // the browser refused; nothing to do but stay windowed
    });
  }

  noOpmodeRunning(props: GraphViewProps) {
    return (
      props.status.opModeInfoList?.length === 0 ||
      props.status.activeOpMode === STOP_OP_MODE_TAG ||
      props.status.activeOpModeStatus === OpModeStatus.STOPPED
    );
  }

  // a dropped socket empties opModeInfoList without ending the run, so a new
  // run is recognised from the op mode status alone
  opmodeRunStarted(props: GraphViewProps, prevProps: GraphViewProps) {
    const stopped = (status: GraphViewProps['status']) =>
      status.activeOpMode === STOP_OP_MODE_TAG ||
      status.activeOpModeStatus === OpModeStatus.STOPPED;

    if (stopped(props.status)) return false;
    if (stopped(prevProps.status)) return true;

    return props.status.activeOpMode !== prevProps.status.activeOpMode;
  }

  // true whenever the plot is frozen, whether by the user, a stopped op mode, or scrubbing
  isPaused() {
    return (
      this.state.userPaused ||
      this.state.opmodePaused ||
      this.state.scrubMs !== null
    );
  }

  effectiveWindowMs() {
    const { windowMs } = this.state;

    return windowMs.valid && windowMs.value > 0
      ? windowMs.value
      : DEFAULT_OPTIONS.windowMs;
  }

  // the span of positions the scrub slider can address; the right edge of the
  // plot can go no further left than one window past the oldest sample, or
  // than the start of a recording shorter than the window
  scrubRangeFor(bounds: TimeBounds) {
    const windowEnd = bounds.minMs + this.effectiveWindowMs();

    return {
      min: windowEnd <= bounds.maxMs ? windowEnd : bounds.minMs,
      max: bounds.maxMs,
    };
  }

  getScrubRange() {
    const bounds = this.state.timeBounds;

    return bounds === null ? null : this.scrubRangeFor(bounds);
  }

  onTimeBounds(timeBounds: TimeBounds | null) {
    this.setState((state) => {
      if (state.scrubMs === null || timeBounds === null) {
        return { timeBounds, scrubMs: state.scrubMs };
      }

      // a truncated history can leave the scrub position out of range
      const range = this.scrubRangeFor(timeBounds);

      return {
        timeBounds,
        scrubMs: Math.min(Math.max(state.scrubMs, range.min), range.max),
      };
    });
  }

  onShownTime(shownMs: number) {
    if (this.state.shownMs === shownMs) return;

    this.setState({ shownMs });
  }

  scrubTo(scrubMs: number | null) {
    const range = this.getScrubRange();
    if (range === null || scrubMs === null) return;

    this.setState((state) => ({
      scrubMs: Math.max(range.min, Math.min(range.max, scrubMs)),
      pausedTime: this.isPaused() ? state.pausedTime : Date.now(),
    }));
  }

  scrubBy(deltaMs: number) {
    const range = this.getScrubRange();
    if (range === null) return;

    this.scrubTo((this.state.scrubMs ?? range.max) + deltaMs);
  }

  goLive() {
    this.cancelPlayback();

    // with the op mode over, End goes to the end of the recording
    const range = this.getScrubRange();
    const endMs =
      this.noOpmodeRunning(this.props) && range !== null ? range.max : null;

    this.setState((state) => ({
      scrubMs: endMs,
      playing: false,
      pausedTime: this.isPaused() ? state.pausedTime : Date.now(),
    }));
  }

  cancelPlayback() {
    if (this.playFrameId !== null) {
      cancelAnimationFrame(this.playFrameId);
      this.playFrameId = null;
    }
  }

  // true when the recorded history can be replayed: the op mode is over, so
  // nothing new is arriving to fight the cursor for the right edge
  canReplay() {
    const range = this.getScrubRange();

    return (
      this.noOpmodeRunning(this.props) &&
      range !== null &&
      range.max > range.min
    );
  }

  // plays the history forward from the cursor at 1x, since telemetry time and
  // wall time are both in milliseconds
  startReplay() {
    const range = this.getScrubRange();
    if (range === null || range.max <= range.min) return;

    // starting from the end (or from live) replays the run from the beginning
    const cursor = this.state.scrubMs;
    const from = cursor === null || cursor >= range.max ? range.min : cursor;

    this.cancelPlayback();
    this.lastPlayFrameMs = performance.now();
    this.setState((state) => ({
      playing: true,
      scrubMs: from,
      pausedTime: this.isPaused() ? state.pausedTime : Date.now(),
    }));
    this.playFrameId = requestAnimationFrame(this.playTick);
  }

  pauseReplay() {
    this.cancelPlayback();
    this.setState({ playing: false });
  }

  playTick(now: number) {
    const range = this.getScrubRange();
    if (range === null) {
      this.pauseReplay();
      return;
    }

    const dt = now - this.lastPlayFrameMs;
    this.lastPlayFrameMs = now;

    const next = (this.state.scrubMs ?? range.min) + dt;

    if (next >= range.max) {
      // played out to the end of the recording
      this.cancelPlayback();
      this.setState({ scrubMs: range.max, playing: false });
      return;
    }

    this.setState({ scrubMs: Math.max(range.min, next) });
    this.playFrameId = requestAnimationFrame(this.playTick);
  }

  resetHistory() {
    this.cancelPlayback();
    this.setState((state) => ({
      runId: state.runId + 1,
      scrubMs: null,
      shownMs: null,
      timeBounds: null,
      playing: false,
    }));
  }

  start() {
    this.setState({
      ...this.state,
      graphing: true,
      userPaused: false,
      scrubMs: null,
      shownMs: null,
      timeBounds: null,
      playing: false,
    });
  }

  stop() {
    this.cancelPlayback();
    this.setState({
      ...this.state,
      graphing: false,
      playing: false,
      scrubMs: null,
      shownMs: null,
      timeBounds: null,
    });
  }

  userPause() {
    this.setState({
      ...this.state,
      userPaused: true,
      pausedTime: this.isPaused() ? this.state.pausedTime : Date.now(),
    });
  }

  opmodePause() {
    this.setState({
      ...this.state,
      opmodePaused: true,
      pausedTime: this.isPaused() ? this.state.pausedTime : Date.now(),
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

  playPauseTitle() {
    if (this.noOpmodeRunning(this.props)) {
      if (this.state.playing) return 'Pause Replay';

      return this.canReplay()
        ? 'Replay the recording from the cursor'
        : 'Nothing recorded to replay yet';
    }

    return this.state.userPaused ? 'Resume Graphing' : 'Pause Graphing';
  }

  togglePlayback() {
    if (this.noOpmodeRunning(this.props)) {
      if (this.state.playing) {
        this.pauseReplay();
      } else {
        this.startReplay();
      }
    } else if (this.state.userPaused) {
      this.userPlay();
    } else {
      this.userPause();
    }
  }

  // the replay loop re-renders every frame, so don't rebuild the samples that
  // haven't changed since the last telemetry packet
  getGraphData() {
    const { telemetry } = this.props;
    const { selectedKeys } = this.state;

    const cached = this.graphDataCache;
    if (
      cached !== null &&
      cached.telemetry === telemetry &&
      cached.selectedKeys === selectedKeys
    ) {
      return cached.data;
    }

    const data = telemetry.map((packet) => [
      {
        name: 'time',
        value: packet.timestamp,
      },
      ...Object.keys(packet.data)
        .filter((key) => selectedKeys.includes(key))
        .map((key) => ({
          name: key,
          value: parseFloat(packet.data[key]),
        })),
    ]);

    this.graphDataCache = { telemetry, selectedKeys, data };

    return data;
  }

  renderScrubber() {
    const bounds = this.state.timeBounds;
    const range = this.getScrubRange();

    const scrubbable =
      bounds !== null && range !== null && range.max > range.min;

    // a frozen plot does not follow the newest sample, so the readout shows
    // the window last drawn, clamped to the recording for display
    const shownEnd =
      this.state.scrubMs ?? (this.isPaused() ? this.state.shownMs : null);
    const position =
      range === null
        ? 0
        : Math.min(Math.max(shownEnd ?? range.max, range.min), range.max);

    const replayMode = this.noOpmodeRunning(this.props);
    const atEnd = range === null || (shownEnd ?? range.max) === range.max;

    // the slider works in ms since the start of the history rather than in
    // absolute telemetry time, which keeps the numbers small and the readout
    // honest: 0 s really is the beginning of the run
    const windowMs = this.effectiveWindowMs();
    const spanMs = bounds === null ? 0 : bounds.maxMs - bounds.minMs;
    const relPosition = bounds === null ? 0 : position - bounds.minMs;
    const relMin =
      bounds === null || range === null ? 0 : range.min - bounds.minMs;

    const windowEndS = relPosition / 1000;
    const windowStartS = Math.max(0, relPosition - windowMs) / 1000;
    const totalS = spanMs / 1000;

    return (
      <div className="flex items-center space-x-3 py-1">
        <input
          type="range"
          min={relMin}
          max={spanMs || 1}
          step={1}
          value={relPosition}
          disabled={!scrubbable}
          onChange={(evt) =>
            this.scrubTo((bounds?.minMs ?? 0) + parseFloat(evt.target.value))
          }
          title={
            scrubbable
              ? 'Drag to pan through the recorded history (or use the arrow keys)'
              : 'Not enough history recorded to pan yet'
          }
          className="h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200 disabled:cursor-default disabled:opacity-50 dark:bg-slate-700
            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500
            [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary-500"
        />
        <span
          className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs tabular-nums text-gray-600 dark:text-gray-400"
          title="Visible window, and the total length of the recorded history"
        >
          {bounds === null ? (
            <>&mdash;</>
          ) : (
            <>
              {windowStartS.toFixed(1)}&ndash;{windowEndS.toFixed(1)}s of{' '}
              {totalS.toFixed(1)}s
            </>
          )}
        </span>
        <button
          className="rounded-md border border-gray-200 bg-gray-100 py-1 px-3 text-sm shadow-md transition-colors hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-opacity-30 disabled:opacity-50 disabled:hover:bg-gray-100 dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:disabled:hover:bg-slate-700"
          onClick={this.goLive}
          disabled={replayMode ? atEnd : this.state.scrubMs === null}
          title={
            replayMode
              ? 'Jump to the end of the recording'
              : 'Return to the live end of the graph'
          }
        >
          {replayMode ? 'End' : 'Live'}
        </button>
      </div>
    );
  }

  render() {
    const showNoNumeric =
      !this.state.graphing && this.state.availableKeys.length === 0;
    const showEmpty =
      this.state.graphing && this.state.selectedKeys.length === 0;
    const showText = showNoNumeric || showEmpty;

    // with the op mode over, the play button replays the recording instead of
    // resuming a live feed that isn't coming back
    const replayMode = this.noOpmodeRunning(this.props);

    const graphData = this.getGraphData();

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
            {this.state.graphing && this.state.selectedKeys.length !== 0 && (
              <BaseViewIconButton
                title={this.playPauseTitle()}
                disabled={
                  replayMode && !this.state.playing && !this.canReplay()
                }
                onClick={this.togglePlayback}
                className="disabled:opacity-40"
              >
                {(replayMode ? !this.state.playing : this.state.userPaused) ? (
                  <PlayIcon className="h-6 w-6" />
                ) : (
                  <PauseIcon className="h-6 w-6" />
                )}
              </BaseViewIconButton>
            )}

            <BaseViewIconButton
              title={this.state.isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              onClick={this.toggleFullscreen}
            >
              {this.state.isFullscreen ? (
                <FullscreenExitIcon className="h-6 w-6" />
              ) : (
                <FullscreenIcon className="h-6 w-6" />
              )}
            </BaseViewIconButton>

            <BaseViewIconButton
              title={this.state.graphing ? 'Stop Graphing' : 'Start Graphing'}
            >
              {this.state.graphing ? (
                <CloseIcon className="h-6 w-6" onClick={this.stop} />
              ) : (
                <ChartIcon className="h-6 w-6" onClick={this.start} />
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
                    onChange={(selectedKeys: string[]) =>
                      this.setState({ selectedKeys })
                    }
                    selected={this.state.selectedKeys}
                  />
                </div>
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
                              validate={validateWindowMs}
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
            <ThemeConsumer>
              {({ isDarkMode }) => (
                <div
                  className="flex h-full flex-col"
                  // focus the view so the arrow keys pan the graph
                  onMouseDown={() =>
                    this.containerRef.current?.focus({ preventScroll: true })
                  }
                >
                  <div className="min-h-0 flex-1">
                    <GraphCanvas
                      data={graphData}
                      options={{
                        windowMs: this.effectiveWindowMs(),
                        gridLineColor: isDarkMode
                          ? colors.slate[500]
                          : colors.gray[300],
                        textColor: isDarkMode
                          ? colors.slate[100]
                          : colors.gray[900],
                      }}
                      paused={this.isPaused()}
                      pausedTime={this.state.pausedTime}
                      scrubMs={this.state.scrubMs}
                      runId={this.state.runId}
                      onTimeBounds={this.onTimeBounds}
                      onShownTime={this.onShownTime}
                    />
                  </div>
                  {this.renderScrubber()}
                </div>
              )}
            </ThemeConsumer>
          )}
        </BaseViewBody>
      </BaseView>
    );
  }
}

export default connector(GraphView);
