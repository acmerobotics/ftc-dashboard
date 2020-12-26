import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import BaseView, { BaseViewHeading, BaseViewBody } from './BaseView';
import MultipleCheckbox from '../components/MultipleCheckbox';
import GraphCanvas from './GraphCanvas';
import TextInput from '../components/inputs/TextInput';

import { ReactComponent as ChartSVG } from '../assets/icons/chart.svg';
import { ReactComponent as CloseSVG } from '../assets/icons/close.svg';
import { ReactComponent as PlaySVG } from '../assets/icons/play_arrow.svg';
import { ReactComponent as PauseSVG } from '../assets/icons/pause.svg';

import { validateInt } from '../components/inputs/validation';
import { DEFAULT_OPTIONS } from './Graph';
import { telemetryType } from './types';

class GraphView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      graphing: false,
      graphPaused: false,
      keys: [],
      windowMs: {
        value: DEFAULT_OPTIONS.windowMs,
        valid: true,
      },
    };

    this.containerRef = React.createRef();

    this.handleClick = this.handleClick.bind(this);
    this.handleDocumentKeydown = this.handleDocumentKeydown.bind(this);
  }

  componentDidMount() {
    this.containerRef.current.addEventListener(
      'keydown',
      this.handleDocumentKeydown,
    );
  }

  componentWillUnmount() {
    this.containerRef.current.removeEventListener(
      'keydown',
      this.handleDocumentKeydown,
    );
  }

  handleDocumentKeydown(evt) {
    if (evt.code === 'Space' || evt.key === 'k') {
      console.log('bruh');
      this.setState({
        ...this.state,
        graphPaused: !this.state.graphPaused,
      });
    }
  }

  startGraphing() {
    this.setState({
      ...this.state,
      graphing: true,
      graphPaused: false,
    });
  }

  stopGraphing() {
    this.setState({
      ...this.state,
      graphing: false,
    });
  }

  handleClick() {
    if (this.state.graphing) {
      this.stopGraphing();
    } else {
      this.startGraphing();
    }
  }

  render() {
    const { telemetry } = this.props;
    const latestPacket = telemetry[telemetry.length - 1];

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
        tabIndex="0"
      >
        <div className="flex-center">
          <BaseViewHeading isDraggable={this.props.isDraggable}>
            Graph
          </BaseViewHeading>
          <div className="flex items-center mr-3 space-x-1">
            {this.state.graphing && this.state.keys.length !== 0 ? (
              <button
                onClick={() => {
                  this.setState({
                    ...this.state,
                    graphPaused: !this.state.graphPaused,
                  });
                }}
                className="w-8 h-8 icon-btn"
              >
                {this.state.graphPaused ? (
                  <PlaySVG className="w-6 h-6" />
                ) : (
                  <PauseSVG className="w-6 h-6" />
                )}
              </button>
            ) : null}

            <button onClick={this.handleClick} className="w-8 h-8 icon-btn">
              {this.state.graphing ? (
                <CloseSVG className="w-6 h-6 text-black" />
              ) : (
                <ChartSVG className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
        {this.state.graphing ? (
          <BaseViewBody>
            <div style={{ height: '100%', minHeight: '10rem' }}>
              {this.state.keys.length === 0 ? (
                <div className="absolute top-0 left-0 w-full h-full flex-center pointer-events-none">
                  <p className="text-center">No telemetry selected to graph</p>
                </div>
              ) : (
                <GraphCanvas
                  data={graphData}
                  options={{
                    windowMs: this.state.windowMs.valid
                      ? this.state.windowMs.value
                      : DEFAULT_OPTIONS.windowMs,
                  }}
                  paused={this.state.graphPaused}
                />
              )}
            </div>
          </BaseViewBody>
        ) : Object.keys(latestPacket.data).length > 0 ? (
          <BaseViewBody>
            <p className="text-lg text-center">
              Press the upper-right button to graph selected keys over time
            </p>
            <h3 className="mt-4">Telemetry to graph:</h3>
            <div className="ml-3">
              <MultipleCheckbox
                arr={Object.keys(latestPacket.data).filter(
                  (key) => !isNaN(parseFloat(latestPacket.data[key])),
                )}
                onChange={(selected) => this.setState({ keys: selected })}
                selected={this.state.keys}
              />
            </div>
            <div style={{ marginTop: '20px' }}>
              <div className="flex justify-between items-center">
                <h3>Options:</h3>
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
                          onChange={({ value, valid }) =>
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
          </BaseViewBody>
        ) : (
          <div className="flex-grow flex-center">
            <p className="text-center">
              Send number-valued telemetry data to graph them over time
            </p>
          </div>
        )}
      </BaseView>
    );
  }
}

GraphView.propTypes = {
  telemetry: telemetryType.isRequired,

  isDraggable: PropTypes.bool,
  isUnlocked: PropTypes.bool,
};

const mapStateToProps = ({ telemetry }) => ({ telemetry });

export default connect(mapStateToProps)(GraphView);
