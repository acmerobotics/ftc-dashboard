import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Heading from '../components/Heading';
import { initOpMode, startOpMode, stopOpMode } from '../actions/opmode';
import OpModeStatus from '../enums/OpModeStatus';
import Icon from '../components/Icon';
import IconGroup from '../components/IconGroup';

const STOP_OP_MODE = '$Stop$Robot$';

class OpModeView extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedOpMode: ''
    };

    this.onChange = this.onChange.bind(this);
  }

  static getDerivedStateFromProps(props, state) {
    if (props.activeOpMode !== STOP_OP_MODE) {
      return {
        selectedOpMode: props.activeOpMode
      };
    } else if (state.selectedOpMode === '' || 
        props.opModeList.indexOf(state.selectedOpMode) === -1) {
      return {
        selectedOpMode: props.opModeList[0] || ''
      };
    } else {
      return {};
    }
  }

  onChange(evt) {
    this.setState({
      selectedOpMode: evt.target.value
    });
  }

  renderInitButton() {
    return <button style={{margin: '4px'}} onClick={() => this.props.dispatch(initOpMode(this.state.selectedOpMode))}>Init</button>;
  }

  renderStartButton() {
    return <button style={{margin: '4px'}} onClick={() => this.props.dispatch(startOpMode())}>Start</button>;
  }

  renderStopButton() {
    return <button style={{margin: '4px'}} onClick={() => this.props.dispatch(stopOpMode())}>Stop</button>;
  }

  renderButtons() {
    const { activeOpMode, activeOpModeStatus, opModeList } = this.props;

    if (opModeList.length === 0) {
      return null;
    } else if (activeOpMode === STOP_OP_MODE) {
      return this.renderInitButton();
    } else if (activeOpModeStatus === OpModeStatus.INIT) {
      return (
        <span>
          {this.renderStartButton()}
          {this.renderStopButton()}
        </span>
      );
    } else if (activeOpModeStatus === OpModeStatus.RUNNING) {
      return this.renderStopButton();
    } else if (activeOpModeStatus === OpModeStatus.STOPPED) {
      return null;
    } else {
      return <p>Unknown op mode status: {activeOpModeStatus}</p>;
    }
  }

  render() {
    const { available, activeOpMode, opModeList, warningMessage, errorMessage } = this.props;

    const { gamepad1Connected, gamepad2Connected } = this.props;

    if (!available) {
      return (
        <div>
          <Heading level={2} text="Op Mode" />
          <p>Event loop detached</p>
        </div>
      );
    }

    return (
      <div>
        <Heading level={2} text="Op Mode">
          <IconGroup>
            <Icon opacity={ gamepad1Connected ? 1.0 : 0.3 } icon="gamepad" size="small" />
            <Icon opacity={ gamepad2Connected ? 1.0 : 0.3 } icon="gamepad" size="small" />
          </IconGroup>
        </Heading>
        <select style={{ margin: '4px' }} 
          value={this.state.selectedOpMode} 
          disabled={ activeOpMode !== STOP_OP_MODE || opModeList.length === 0 } 
          onChange={this.onChange}>
          {
            opModeList.length === 0 ?
              (<option>Loading...</option>) :
              opModeList
                .sort()
                .map((opMode) => (
                  <option key={opMode}>{opMode}</option>
                ))
          }
        </select>
        {this.renderButtons()}
        {
          errorMessage !== '' ?
            <p className="error">Error: {errorMessage}</p> : null
        }
        {
          warningMessage !== '' ?
            <p className="warning">Warning: {warningMessage}</p> : null
        }
      </div>
    );
  }
}

OpModeView.propTypes = {
  available: PropTypes.bool.isRequired, 
  activeOpMode: PropTypes.string.isRequired,
  activeOpModeStatus: PropTypes.oneOf(Object.keys(OpModeStatus)),
  opModeList: PropTypes.arrayOf(PropTypes.string).isRequired,
  warningMessage: PropTypes.string.isRequired,
  errorMessage: PropTypes.string.isRequired,
  dispatch: PropTypes.func.isRequired,
  gamepad1Connected: PropTypes.bool.isRequired,
  gamepad2Connected: PropTypes.bool.isRequired
};

const mapStateToProps = ({ status, gamepad }) => ({
  ...status,
  ...gamepad
});

export default connect(mapStateToProps)(OpModeView);
