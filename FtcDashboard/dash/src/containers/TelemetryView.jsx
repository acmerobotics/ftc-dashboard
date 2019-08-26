import React from 'react';
import { connect } from 'react-redux';
import Heading from '../components/Heading';
import { telemetryType } from './types';

const TelemetryView = ({ telemetry }) => {
  const latestPacket = telemetry[telemetry.length - 1];
  const telemetryLines = Object.keys(latestPacket.data)
    .map(key => (
      <span key={key}>
        {key}: {latestPacket.data[key]}
        <br />
      </span>
    ));
  const telemetryLog = latestPacket.log.map((line, i) => (
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
  telemetry: telemetryType.isRequired
};

const mapStateToProps = ({ telemetry }) => ({
  telemetry
});

export default connect(mapStateToProps)(TelemetryView);
