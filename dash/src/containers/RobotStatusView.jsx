import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Heading from '../components/Heading';

const RobotStatusView = ({ available, activeOpMode, activeOpModeStatus }) => {
  return (
    <div>
      <Heading level={2} text="Robot Status" />
      <p>Available: {JSON.stringify(available)}</p>
      <p>Active Op Mode: {activeOpMode}</p>
      <p>Op Mode Status: {activeOpModeStatus}</p>
    </div>
  );
};

RobotStatusView.propTypes = {
  available: PropTypes.bool.isRequired, 
  activeOpMode: PropTypes.string.isRequired,
  activeOpModeStatus: PropTypes.oneOf(['INIT', 'RUNNING', 'STOPPED']),
};

const mapStateToProps = ({ status }) => status;

export default connect(mapStateToProps)(RobotStatusView);
