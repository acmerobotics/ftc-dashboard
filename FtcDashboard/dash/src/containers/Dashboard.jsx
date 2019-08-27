import React, { Component } from 'react';
import { connect as reduxConnect } from 'react-redux';
import PropTypes from 'prop-types';
import Heading from '../components/Heading';
import Header from '../components/Header';
import IconGroup from '../components/IconGroup';
import Icon from '../components/Icon';
import LayoutPreset from '../enums/LayoutPreset';
import { connect, disconnect } from '../actions/socket';
import { saveLayoutPreset, getLayoutPreset } from '../actions/settings';

class Dashboard extends Component {
  componentDidMount() {
    this.props.dispatch(connect(process.env.REACT_APP_HOST || window.location.hostname, process.env.REACT_APP_PORT));
    this.props.dispatch(getLayoutPreset());
  }

  componentWillUnmount() {
    this.props.dispatch(disconnect());
  }

  render() {
    return (
      <div>
        <Header>
          <Heading text="FTC Dashboard" level={1}>
            <IconGroup>
              <select 
                style={{ margin: '0px 8px 0px 8px' }}
                value={this.props.layoutPreset} 
                onChange={evt => this.props.dispatch(saveLayoutPreset(evt.target.value))}>
                {
                  Object.keys(LayoutPreset)
                    .filter((key) => typeof LayoutPreset[key] == 'string')
                    .map((key) => (
                      <option key={key} value={key}>{LayoutPreset.getName(key)}</option>
                    ))
                }
              </select>
              {
                this.props.isConnected ?
                  <p style={{ width: '60px', margin: '0px 8px 0px 8px', textAlign: 'right' }}>{this.props.pingTime}ms</p>
                  : null
              }
              <Icon icon={this.props.isConnected ? 'wifi' : 'no-wifi'} size="large" />
            </IconGroup>
          </Heading>
        </Header>
        { LayoutPreset.getContent(this.props.layoutPreset) }
      </div>
    );
  }
}

Dashboard.propTypes = {
  isConnected: PropTypes.bool.isRequired,
  pingTime: PropTypes.number.isRequired,
  layoutPreset: PropTypes.oneOf(Object.keys(LayoutPreset)).isRequired,
  dispatch: PropTypes.func.isRequired
};

const mapStateToProps = ({ socket, settings }) => ({
  isConnected: socket.isConnected,
  pingTime: socket.pingTime,
  layoutPreset: settings.layoutPreset
});

export default reduxConnect(mapStateToProps)(Dashboard);
