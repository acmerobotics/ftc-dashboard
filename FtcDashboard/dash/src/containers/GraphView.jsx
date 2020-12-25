import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import BaseView, { BaseViewHeading } from './BaseView';
import MultipleCheckbox from '../components/MultipleCheckbox';
import GraphCanvas from './GraphCanvas';
import TextInput from '../components/inputs/TextInput';

import { ReactComponent as ChartSVG } from '../assets/icons/chart.svg';
import { ReactComponent as CloseSVG } from '../assets/icons/close.svg';

import { validateInt } from '../components/inputs/validation';
import { DEFAULT_OPTIONS } from './Graph';
import { telemetryType } from './types';

class GraphView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      graphing: false,
      keys: [],
      windowMs: {
        value: DEFAULT_OPTIONS.windowMs,
        valid: true,
      },
    };

    this.handleClick = this.handleClick.bind(this);
  }

  startGraphing() {
    this.setState({
      graphing: true,
    });
  }

  stopGraphing() {
    this.setState({
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
      >
        <div className="flex justify-between items-center">
          <BaseViewHeading isDraggable={this.props.isDraggable}>
            Graph
          </BaseViewHeading>
          <button onClick={this.handleClick} className="w-8 h-8 icon-btn">
            {this.state.graphing ? (
              <CloseSVG className="w-6 h-6 text-black" />
            ) : (
              <ChartSVG className="w-6 h-6" />
            )}
          </button>
        </div>
        {this.state.graphing ? (
          <div className="canvas-container">
            {this.state.keys.length === 0 ? (
              <div className="absolute top-0 left-0 w-full h-full flex justify-center items-center pointer-events-none">
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
              />
            )}
          </div>
        ) : Object.keys(latestPacket.data).length > 0 ? (
          <div>
            <p className="text-lg">
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
          </div>
        ) : (
          <div className="flex-grow flex items-center justify-center">
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
