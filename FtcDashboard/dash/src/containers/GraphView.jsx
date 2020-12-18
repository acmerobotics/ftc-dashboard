import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import MultipleCheckbox from '../components/MultipleCheckbox';
import GraphCanvas from './GraphCanvas';
import IconGroup from '../components/IconGroup';
import Icon from '../components/Icon';
import TextInput from '../components/inputs/TextInput';

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
      <div className="h-full px-4 py-2 bg-white bg-opacity-75 rounded overflow-hidden shadow-md">
        <div className="flex justify-between items-center">
          <h2
            className={`${
              this.props.isDraggable ? 'grab-handle' : ''
            } text-xl w-full py-2 font-bold`}
          >
            Graph
          </h2>
          <IconGroup>
            <Icon
              icon={this.state.graphing ? 'close' : 'chart'}
              size="small"
              onClick={this.handleClick}
            />
          </IconGroup>
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
        ) : (
          <div>
            <MultipleCheckbox
              arr={Object.keys(latestPacket.data).filter(
                (key) => !isNaN(parseFloat(latestPacket.data[key])),
              )}
              onChange={(selected) => this.setState({ keys: selected })}
              selected={this.state.keys}
            />
            {Object.keys(latestPacket.data).length > 0 ? (
              <div style={{ marginTop: '20px' }}>
                <div className="flex justify-between items-center">
                  <h3>Options</h3>
                </div>
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
            ) : (
              <p>Sent telemetry items will appear here for graphing</p>
            )}
          </div>
        )}
      </div>
    );
  }
}

GraphView.propTypes = {
  telemetry: telemetryType.isRequired,
  isDraggable: PropTypes.bool,
};

const mapStateToProps = ({ telemetry }) => ({ telemetry });

export default connect(mapStateToProps)(GraphView);
