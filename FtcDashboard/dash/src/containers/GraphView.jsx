import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import BaseView from './BaseView';
import MultipleCheckbox from '../components/MultipleCheckbox';
import GraphCanvas from './GraphCanvas';
import Icon from '../components/Icon';
import TextInput from '../components/inputs/TextInput';

import { ReactComponent as ChartSVG } from '../assets/icons/chart.svg';

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
        showShadow={this.props.showShadow}
      >
        <div className="flex justify-between items-center">
          <h2
            className={`${
              this.props.isDraggable ? 'grab-handle' : ''
            } text-xl w-full py-2 font-bold`}
          >
            Graph
          </h2>
          <button
            onClick={this.handleClick}
            className="rounded-md text-gray-800 w-8 h-8 flex justify-center items-center border border-transparent hover:border-gray-500 transition-colors"
          >
            {this.state.graphing ? (
              <Icon icon="close" size="small" onClick={this.handleClick} />
            ) : (
              <ChartSVG className="w-6 h-6" />
            )}
          </button>
        </div>
        {this.state.graphing ? (
          <div className="canvas-container">
            <GraphCanvas
              data={graphData}
              options={{
                windowMs: this.state.windowMs.valid
                  ? this.state.windowMs.value
                  : DEFAULT_OPTIONS.windowMs,
              }}
            />
          </div>
        ) : Object.keys(latestPacket.data).length > 0 ? (
          <div className="flex-grow flex flex-col justify-between">
            <div>
              <h3 className="mt-2">Variables to graph:</h3>
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
            <p className="text-center text-gray-600 mb-3">
              Click the button in the top right to switch to the graphing view!
            </p>
          </div>
        ) : (
          <p className="text-center mt-10 text-gray-600">
            Graph related telemetry packets have not yet been received :(
            <br />
            They will appear here once sent!
          </p>
        )}
      </BaseView>
    );
  }
}

GraphView.propTypes = {
  telemetry: telemetryType.isRequired,

  isDraggable: PropTypes.bool,
  showShadow: PropTypes.bool,
};

const mapStateToProps = ({ telemetry }) => ({ telemetry });

export default connect(mapStateToProps)(GraphView);
