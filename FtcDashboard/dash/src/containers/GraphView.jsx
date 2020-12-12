import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import Heading from '../components/Heading';
import MultipleCheckbox from '../components/MultipleCheckbox';
import GraphCanvas from './GraphCanvas';
import IconGroup from '../components/IconGroup';
import Icon from '../components/Icon';
import TextInput from '../components/inputs/TextInput';

import LayoutPreset from '../enums/LayoutPreset';
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

    this.layoutPreset = LayoutPreset.DEFAULT;
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
      <div style={{ height: '100%', padding: '1em' }}>
        <div className="heading">
          <h2
            className={
              this.props.layoutPreset == LayoutPreset.CONFIGURABLE
                ? 'grab-handle'
                : ''
            }
            style={{ width: '100%' }}
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
                <Heading level={3} text="Options" />
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
  // This should be
  // PropTypes.oneOf(Object.keys(LayoutPreset)).isRequired
  // but for some reason it breaks
  layoutPreset: PropTypes.any,
};

const mapStateToProps = ({ telemetry, settings }) => ({
  telemetry,
  layoutPreset: settings.layoutPreset,
});

export default connect(mapStateToProps)(GraphView);
