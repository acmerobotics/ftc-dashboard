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
        <header className="flex items-center justify-between bg-blue-600 px-3 py-1 text-white">
          <h1 className="text-2xl font-medium">FTC Dashboard</h1>
          <div className="flex-center">
            <select
              className="mx-2 rounded border-blue-300 bg-blue-100 py-1 text-sm text-black focus:border-blue-100 focus:ring-2 focus:ring-white focus:ring-opacity-40"
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
              <ConnectedIcon className="ml-4 h-10 w-10" />
            ) : (
              <DisconnectedIcon className="ml-4 h-10 w-10" />
            )}
          </div>
        </header>
        {this.props.isConnected && !this.props.enabled ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}
          >
            <div
              className="justify-self-center text-center"
              style={{ maxWidth: '600px' }}
            >
              <h1 className="text-xl font-medium">FTC Dashboard is Disabled</h1>
              <p>
                To re-enable, run the &quot;Enable/Disable Dashboard&quot; op
                mode or select &quot;Enable Dashboard&quot; from the RC menu
              </p>
            </div>
          </div>
        ) : (
          LayoutPreset.getContent(this.props.layoutPreset)
        )}
      </div>
    );
  }
}

Dashboard.propTypes = {
  isConnected: PropTypes.bool.isRequired,
  pingTime: PropTypes.number.isRequired,
  layoutPreset: PropTypes.oneOf(Object.keys(LayoutPreset)).isRequired,
  enabled: PropTypes.bool.isRequired,
  dispatch: PropTypes.func.isRequired,
};

const mapStateToProps = ({ socket, settings, status }) => ({
  isConnected: socket.isConnected,
  pingTime: socket.pingTime,
  layoutPreset: settings.layoutPreset,
  enabled: status.enabled,
});

export default reduxConnect(mapStateToProps)(Dashboard);
