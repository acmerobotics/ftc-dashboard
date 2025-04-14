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

import { RootState } from '@/store/reducers';
import { STOP_OP_MODE_TAG } from '@/store/types';
import { OpModeStatus } from '@/enums/OpModeStatus';
import { colors, ThemeConsumer } from '@/hooks/useTheme';
import { DEFAULT_OPTIONS } from './Graph';
import { validateInt, ValResult } from '@/components/inputs/validation';

type GraphViewState = {
  graphing: boolean;
  opmodePaused: boolean;
  userPaused: boolean;
  pausedTime: number;
  availableKeys: string[];
  selectedKeys: string[];
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

    this.handleDocumentKeydown = this.handleDocumentKeydown.bind(this);
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
        return { availableKeys: [], selectedKeys: [] };
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
    if (evt.code === 'Space' || evt.key === 'k') {
      this.setState({
        ...this.state,
        userPaused: !this.state.userPaused,
        pausedTime: Date.now(),
      });
    }
  }

  noOpmodeRunning(props: GraphViewProps) {
    return (
      props.status.opModeList?.length === 0 ||
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
                title={
                  this.state.userPaused
                    ? 'Resume Graphing'
                    : this.noOpmodeRunning(this.props)
                    ? 'Graphing will restart when an OpMode starts'
                    : 'Pause Graphing'
                }
                className="icon-btn h-8 w-8"
              >
                {this.state.userPaused ? (
                  <PlayIcon className="h-6 w-6" onClick={this.userPlay} />
                ) : (
                  <PauseIcon className="h-6 w-6" onClick={this.userPause} />
                )}
              </BaseViewIconButton>
            )}

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
            <ThemeConsumer>
              {({ isDarkMode }) => (
                <GraphCanvas
                  data={graphData}
                  options={{
                    windowMs: this.state.windowMs.valid
                      ? this.state.windowMs.value
                      : DEFAULT_OPTIONS.windowMs,
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
          )}
        </BaseViewBody>
      </BaseView>
    );
  }
}

export default connector(GraphView);
