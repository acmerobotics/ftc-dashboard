import React, { Component } from 'react';
import { connect as reduxConnect } from 'react-redux';
import PropTypes from 'prop-types';

import IconGroup from '../components/IconGroup';
import Icon from '../components/Icon';

import LayoutPreset from '../enums/LayoutPreset';
import { connect, disconnect } from '../actions/socket';
import { saveLayoutPreset, getLayoutPreset } from '../actions/settings';

class Dashboard extends Component {
  componentDidMount() {
    this.props.dispatch(
      connect(
        process.env.REACT_APP_HOST || window.location.hostname,
        process.env.REACT_APP_PORT,
      ),
    );
    this.props.dispatch(getLayoutPreset());
  }

  componentWillUnmount() {
    this.props.dispatch(disconnect());
  }

  render() {
    return (
      <div>
        <header className="bg-blue-600 px-3 py-1 text-white">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-medium">FTC Dashboard</h1>
            <IconGroup>
              <select
                className="text-black text-sm rounded py-1 bg-blue-100 border-blue-300 focus:ring focus:ring-blue-200"
                style={{ margin: '0px 8px 0px 8px' }}
                value={this.props.layoutPreset}
                onChange={(evt) =>
                  this.props.dispatch(saveLayoutPreset(evt.target.value))
                }
              >
                {Object.keys(LayoutPreset)
                  .filter((key) => typeof LayoutPreset[key] === 'string')
                  .map((key) => (
                    <option key={key} value={key}>
                      {LayoutPreset.getName(key)}
                    </option>
                  ))}
              </select>
              {this.props.isConnected ? (
                <p
                  style={{
                    width: '60px',
                    margin: '0px 8px 0px 8px',
                    textAlign: 'right',
                  }}
                >
                  {this.props.pingTime}ms
                </p>
              ) : null}
              <Icon
                icon={this.props.isConnected ? 'wifi' : 'no-wifi'}
                size="large"
              />
            </IconGroup>
          </div>
        </header>
        {LayoutPreset.getContent(this.props.layoutPreset)}
      </div>
    );
  }
}

Dashboard.propTypes = {
  isConnected: PropTypes.bool.isRequired,
  pingTime: PropTypes.number.isRequired,
  layoutPreset: PropTypes.oneOf(Object.keys(LayoutPreset)).isRequired,
  dispatch: PropTypes.func.isRequired,
};

const mapStateToProps = ({ socket, settings }) => ({
  isConnected: socket.isConnected,
  pingTime: socket.pingTime,
  layoutPreset: settings.layoutPreset,
});

export default reduxConnect(mapStateToProps)(Dashboard);
