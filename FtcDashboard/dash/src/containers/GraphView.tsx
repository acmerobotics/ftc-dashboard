import React, { Component } from 'react';
import { connect, ConnectedProps } from 'react-redux';

import BaseView, {
  BaseViewHeading,
  BaseViewBody,
  BaseViewIcons,
  BaseViewIconButton,
  BaseViewProps,
  BaseViewHeadingProps,
} from './BaseView';
import MultipleCheckbox from '../components/MultipleCheckbox';
import GraphCanvas from './GraphCanvas';
import TextInput from '../components/inputs/TextInput';

import { ReactComponent as ChartIcon } from '../assets/icons/chart.svg';
import { ReactComponent as CloseIcon } from '../assets/icons/close.svg';
import { ReactComponent as PlayIcon } from '../assets/icons/play_arrow.svg';
import { ReactComponent as PauseIcon } from '../assets/icons/pause.svg';

import { RootState } from '../store/reducers';
import { validateInt } from '../components/inputs/validation';
import { DEFAULT_OPTIONS } from './Graph';

type GraphViewState = {
  graphing: boolean;
  paused: boolean;
  keys: string[];
  windowMs: {
    value: number;
    valid: boolean;
  };
};

const mapStateToProps = (state: RootState) => ({
  telemetry: state.telemetry,
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
      paused: false,
      keys: [],
      windowMs: {
        value: DEFAULT_OPTIONS.windowMs,
        valid: true,
      },
    };

    this.containerRef = React.createRef();

    this.start = this.start.bind(this);
    this.stop = this.stop.bind(this);

    this.play = this.play.bind(this);
    this.pause = this.pause.bind(this);

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

  handleDocumentKeydown(evt: KeyboardEvent) {
    if (evt.code === 'Space' || evt.key === 'k') {
      this.setState({
        ...this.state,
        paused: !this.state.paused,
      });
    }
  }

  start() {
    this.setState({
      ...this.state,
      graphing: true,
      paused: false,
    });
  }

  stop() {
    this.setState({
      ...this.state,
      graphing: false,
    });
  }

  pause() {
    this.setState({
      ...this.state,
      paused: true,
    });
  }

  play() {
    this.setState({
      ...this.state,
      paused: false,
    });
  }

  render() {
    const { telemetry } = this.props;
    const latestPacket = telemetry[telemetry.length - 1];

    const numericKeys = Object.keys(latestPacket.data).filter(
      (key) => !isNaN(parseFloat(latestPacket.data[key])),
    );
    const showNoNumeric = !this.state.graphing && numericKeys.length === 0;
    const showEmpty = this.state.graphing && this.state.keys.length === 0;
    const showText = showNoNumeric || showEmpty;

    const graphData = telemetry.map((packet) => [
      {
        name: 'time',
        value: packet.timestamp,
      },
      ...Object.keys(packet.data)
        .filter((key) => this.state.keys.includes(key))
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
            {this.state.graphing && this.state.keys.length !== 0 && (
              <BaseViewIconButton className="w-8 h-8 icon-btn">
                {this.state.paused ? (
                  <PlayIcon className="w-6 h-6" onClick={this.play} />
                ) : (
                  <PauseIcon className="w-6 h-6" onClick={this.pause} />
                )}
              </BaseViewIconButton>
            )}

            <BaseViewIconButton>
              {this.state.graphing ? (
                <CloseIcon className="w-6 h-6 text-black" onClick={this.stop} />
              ) : (
                <ChartIcon className="w-6 h-6" onClick={this.start} />
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
                    arr={numericKeys}
                    onChange={(selected: string[]) =>
                      this.setState({ keys: selected })
                    }
                    selected={this.state.keys}
                  />
                </div>
                <div className="mt-4">
                  <div className="flex justify-between items-center">
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
                              onChange={({
                                value,
                                valid,
                              }: {
                                value: number;
                                valid: boolean;
                              }) =>
                                this.setState({
                                  windowMs: {
                                    value,
                                    valid,
                                  },
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
            <GraphCanvas
              data={graphData}
              options={{
                windowMs: this.state.windowMs.valid
                  ? this.state.windowMs.value
                  : DEFAULT_OPTIONS.windowMs,
              }}
              paused={this.state.paused}
            />
          )}
        </BaseViewBody>
      </BaseView>
    );
  }
}

export default connector(GraphView);
