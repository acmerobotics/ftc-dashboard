import { Component } from 'react';
import { connect as reduxConnect } from 'react-redux';
import PropTypes from 'prop-types';

import LayoutPreset from '@/enums/LayoutPreset';
import { connect, disconnect } from '@/store/actions/socket';
import { saveLayoutPreset, getLayoutPreset } from '@/store/actions/settings';

import { ReactComponent as ConnectedIcon } from '@/assets/icons/wifi.svg';
import { ReactComponent as DisconnectedIcon } from '@/assets/icons/wifi_off.svg';

class Dashboard extends Component {
  componentDidMount() {
    this.props.dispatch(
      connect(
        import.meta.env['VITE_REACT_APP_HOST'] || window.location.hostname,
        import.meta.env['VITE_REACT_APP_PORT'],
      ),
    );
    this.props.dispatch(getLayoutPreset());
  }

  componentWillUnmount() {
    this.props.dispatch(disconnect());
  }

  render() {
    return (
      <div
        className="flex flex-col"
        style={{ width: '100vw', height: '100vh' }}
      >
        <header className="flex items-center justify-between px-3 py-1 text-white bg-blue-600">
          <h1 className="text-2xl font-medium">FTC Dashboard</h1>
          <div className="flex-center">
            <select
              className="py-1 mx-2 text-sm text-black bg-blue-100 border-blue-300 rounded focus:border-blue-100 focus:ring-2 focus:ring-white focus:ring-opacity-40"
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
            {this.props.isConnected && (
              <p
                className="mx-2"
                style={{
                  width: '60px',
                  textAlign: 'right',
                }}
              >
                {this.props.pingTime}ms
              </p>
            )}
            {this.props.isConnected ? (
              <ConnectedIcon className="w-10 h-10 ml-4" />
            ) : (
              <DisconnectedIcon className="w-10 h-10 ml-4" />
            )}
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
