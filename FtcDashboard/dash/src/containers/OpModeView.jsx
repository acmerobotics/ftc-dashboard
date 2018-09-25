import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Heading from '../components/Heading';
import { initOpMode, startOpMode, stopOpMode } from '../actions/opmode';
import OpModeStatus from '../enums/OpModeStatus';

const DEFAULT_OP_MODE = '$Stop$Robot$';

class OpModeView extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedOpMode: ''
    };

    this.onChange = this.onChange.bind(this);
  }

  static getDerivedStateFromProps(props, state) {
    if (props.activeOpMode !== DEFAULT_OP_MODE) {
      return {
        selectedOpMode: props.activeOpMode
      };
    } else if (state.selectedOpMode === '') {
      return {
        selectedOpMode: props.opModeList[0]
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
    return <button onClick={() => this.props.dispatch(initOpMode(this.state.selectedOpMode))}>Init</button>;
  }

  renderStartButton() {
    return <button onClick={() => this.props.dispatch(startOpMode())}>Start</button>;
  }

  renderStopButton() {
    return <button onClick={() => this.props.dispatch(stopOpMode())}>Stop</button>;
  }

  renderButtons() {
    const { activeOpMode, activeOpModeStatus, opModeList } = this.props;

    if (opModeList.length == 0) {
      return null;
    } else if (activeOpMode === DEFAULT_OP_MODE) {
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
        <Heading level={2} text="Op Mode" />
        <p/>
        <select value={this.state.selectedOpMode} disabled={activeOpMode !== DEFAULT_OP_MODE} onChange={this.onChange}>
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
        &nbsp;
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
  dispatch: PropTypes.func.isRequired
};

const mapStateToProps = ({ status }) => status;

export default connect(mapStateToProps)(OpModeView);
