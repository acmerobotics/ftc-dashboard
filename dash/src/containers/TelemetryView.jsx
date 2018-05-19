import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Heading from '../components/Heading';

const TelemetryView = ({ telemetry }) => {
  const telemetryLines = Object.keys(telemetry.data)
    .map(key => (
      <span key={key}>
        {key}: {telemetry.data[key]}
        <br />
      </span>
    ));
  const telemetryLog = telemetry.log.map((line, i) => (
    <span key={i}>{line}<br /></span>
  ));
  return (
    <div>
      <Heading level={2} text="Telemetry" />
      <p>{telemetryLines}</p>
      <p>{telemetryLog}</p>
    </div>
  );
};

TelemetryView.propTypes = {
  telemetry: PropTypes.shape({
    log: PropTypes.arrayOf(PropTypes.string).isRequired,
    data: PropTypes.object.isRequired,
    timestamp: PropTypes.number.isRequired
  }).isRequired
};

const mapStateToProps = ({ telemetry }) => ({
  telemetry
});

export default connect(mapStateToProps)(TelemetryView);
