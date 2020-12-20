import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import { initOpMode, startOpMode, stopOpMode } from '../actions/opmode';
import OpModeStatus from '../enums/OpModeStatus';
import Icon from '../components/Icon';
import IconGroup from '../components/IconGroup';
import BaseView from './BaseView';

const STOP_OP_MODE = '$Stop$Robot$';

class OpModeView extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedOpMode: '',
    };

    this.onChange = this.onChange.bind(this);
  }

  static getDerivedStateFromProps(props, state) {
    if (props.activeOpMode !== STOP_OP_MODE) {
      return {
        selectedOpMode: props.activeOpMode,
      };
    } else if (
      state.selectedOpMode === '' ||
      props.opModeList.indexOf(state.selectedOpMode) === -1
    ) {
      return {
        selectedOpMode: props.opModeList[0] || '',
      };
    } else {
      return {};
    }
  }

  onChange(evt) {
    this.setState({
      selectedOpMode: evt.target.value,
    });
  }

  renderInitButton() {
    return (
      <button
        className="ml-3 bg-blue-200 rounded-md py-1 px-4 border border-blue-300 shadow-md"
        onClick={() =>
          this.props.dispatch(initOpMode(this.state.selectedOpMode))
        }
      >
        Init
      </button>
    );
  }

  renderStartButton() {
    return (
      <button
        className="ml-3 bg-green-200 rounded-md py-1 px-2 border border-green-300 shadow-md"
        onClick={() => this.props.dispatch(startOpMode())}
      >
        Start
      </button>
    );
  }

  renderStopButton() {
    return (
      <button
        className="ml-3 bg-red-200 rounded-md py-1 px-2 border border-red-300 shadow-md"
        onClick={() => this.props.dispatch(stopOpMode())}
      >
        Stop
      </button>
    );
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
    const {
      available,
      activeOpMode,
      opModeList,
      warningMessage,
      errorMessage,
    } = this.props;

    const { gamepad1Connected, gamepad2Connected } = this.props;

    if (!available) {
      return (
        <BaseView showShadow={this.props.showShadow}>
          <div className="flex justify-between items-center" />
          <h2
            className={`${
              this.props.isDraggable ? 'grab-handle' : ''
            } text-xl w-full py-2 font-bold`}
          >
            Op Mode
          </h2>
          <p>Event loop detached</p>
        </BaseView>
      );
    }

    return (
      <BaseView showShadow={this.props.showShadow}>
        <div className="flex justify-between items-center">
          <h2
            className={`${
              this.props.isDraggable ? 'grab-handle' : ''
            } text-xl w-full py-2 font-bold`}
          >
            Op Mode
          </h2>
          <IconGroup>
            <Icon
              opacity={gamepad1Connected ? 1.0 : 0.3}
              icon="gamepad"
              size="small"
            />
            <Icon
              opacity={gamepad2Connected ? 1.0 : 0.3}
              icon="gamepad"
              size="small"
            />
          </IconGroup>
        </div>
        <select
          className="bg-gray-200 rounded py-2 px-2 mt-4 border border-gray-300 m-1 shadow-md disabled:shadow-none disabled:text-gray-600 transition"
          value={this.state.selectedOpMode}
          disabled={activeOpMode !== STOP_OP_MODE || opModeList.length === 0}
          onChange={this.onChange}
        >
          {opModeList.length === 0 ? (
            <option>Loading...</option>
          ) : (
            opModeList
              .sort()
              .map((opMode) => <option key={opMode}>{opMode}</option>)
          )}
        </select>
        {this.renderButtons()}
        {errorMessage !== '' ? (
          <p className="error mt-5">Error: {errorMessage}</p>
        ) : null}
        {warningMessage !== '' ? (
          <p className="warning mt-5">Warning: {warningMessage}</p>
        ) : null}
      </BaseView>
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
  gamepad2Connected: PropTypes.bool.isRequired,

  isDraggable: PropTypes.bool,
  showShadow: PropTypes.bool,
};

const mapStateToProps = ({ status, gamepad }) => ({
  ...status,
  ...gamepad,
});

export default connect(mapStateToProps)(OpModeView);
