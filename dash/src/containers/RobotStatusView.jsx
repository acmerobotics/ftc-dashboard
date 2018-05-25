import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Heading from '../components/Heading';
import { getOpModeList } from '../actions/status';

class RobotStatusView extends React.Component {
  componentWillMount() {
    this.props.dispatch(getOpModeList());
  }

  render() {
    const { available, activeOpMode, activeOpModeStatus, opModeList } = this.props;

    return (
      <div>
        <Heading level={2} text="Robot Status" />
        <p>Available: {JSON.stringify(available)}</p>
        <p>Active Op Mode: {activeOpMode}</p>
        <p>Op Mode Status: {activeOpModeStatus}</p>
        <ol>
          {
            opModeList.map((opMode) => (
              <li key={opMode}>{opMode}</li>
            ))
          }
        </ol>
      </div>
    );
  }
}

RobotStatusView.propTypes = {
  available: PropTypes.bool.isRequired, 
  activeOpMode: PropTypes.string.isRequired,
  activeOpModeStatus: PropTypes.oneOf(['INIT', 'RUNNING', 'STOPPED']),
  opModeList: PropTypes.arrayOf(PropTypes.string).isRequired,
};

const mapStateToProps = ({ status }) => status;

export default connect(mapStateToProps)(RobotStatusView);
