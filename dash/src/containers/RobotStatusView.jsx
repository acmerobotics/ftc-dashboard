import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Heading from '../components/Heading';
import { initOpMode, startOpMode, stopOpMode } from '../actions/opmode';

class RobotStatusView extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selectedOpMode: ''
    };

    this.onChange = this.onChange.bind(this);
  }

  componentWillReceiveProps(newProps) {
    console.log(newProps);
    if (newProps !== '$Stop$Robot$') {
      this.setState({
        selectedOpMode: newProps.activeOpMode
      });
    } else {
      this.setState({
        selectedOpMode: newProps.opModeList[0]
      });
    }
  }

  onChange(evt) {
    this.setState({
      selectedOpMode: evt.target.value
    });
  }

  render() {
    const { available, activeOpMode, activeOpModeStatus, opModeList, dispatch } = this.props;

    let buttonText, buttonAction;
    if (activeOpMode === '$Stop$Robot$') {
      buttonText = 'Init';
      buttonAction = () => dispatch(initOpMode(this.state.selectedOpMode));
    } else if (activeOpModeStatus === 'INIT') {
      buttonText = '▶ Start';
      buttonAction = () => dispatch(startOpMode());
    } else if (activeOpModeStatus === 'RUNNING') {
      buttonText = '■ Stop';
      buttonAction = () => dispatch(stopOpMode());
    } else {
      buttonText = '';
      buttonAction = () => {};
    }

    if (!available) {
      return (
        <div>
          <Heading level={2} text="Robot Status" />
          <p>Event loop detached</p>
        </div>
      );
    }

    return (
      <div>
        <Heading level={2} text="Robot Status" />
        <p/>
        <select value={this.state.selectedOpMode} disabled={activeOpMode !== '$Stop$Robot$'} onChange={this.onChange}>
          {
            opModeList.length === 0 ?
              (<option>Loading...</option>) :
              opModeList
                .sort()
                .map((opMode) => (
                  <option key={opMode}>{opMode}</option>
                ))
          }
        </select>&nbsp;
        <button onClick={buttonAction}>{buttonText}</button>
        <p>Active Op Mode: {activeOpMode}</p>
      </div>
    );
  }
}

RobotStatusView.propTypes = {
  available: PropTypes.bool.isRequired, 
  activeOpMode: PropTypes.string.isRequired,
  activeOpModeStatus: PropTypes.oneOf(['INIT', 'RUNNING', 'STOPPED']),
  opModeList: PropTypes.arrayOf(PropTypes.string).isRequired,
  dispatch: PropTypes.func.isRequired
};

const mapStateToProps = ({ status }) => status;

export default connect(mapStateToProps)(RobotStatusView);
