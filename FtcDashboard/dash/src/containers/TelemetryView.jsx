import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import LayoutPreset from '../enums/LayoutPreset';
import { telemetryType } from './types';

const TelemetryView = ({ telemetry, layoutPreset }) => {
  const latestPacket = telemetry[telemetry.length - 1];
  const telemetryLines = Object.keys(latestPacket.data).map((key) => (
    <span key={key}>
      {key}: {latestPacket.data[key]}
      <br />
    </span>
  ));

  const telemetryLog = latestPacket.log.map((line, i) => (
    <span key={i}>
      {line}
      <br />
    </span>
  ));

  return (
    <div style={{ padding: '1em', paddingTop: '0.5em' }}>
      <h2
        className={`${
          layoutPreset == LayoutPreset.CONFIGURABLE ? 'grab-handle' : ''
        } text-xl w-full py-2 font-bold`}
      >
        Telemetry
      </h2>
      <p>{telemetryLines}</p>
      <p>{telemetryLog}</p>
      <p>{layoutPreset == LayoutPreset.CONFIGURABLE}</p>
    </div>
  );
};

TelemetryView.propTypes = {
  telemetry: telemetryType.isRequired,
  // This should be
  // PropTypes.oneOf(Object.keys(LayoutPreset)).isRequired
  // but for some reason it breaks
  layoutPreset: PropTypes.any,
};

const mapStateToProps = ({ telemetry, settings }) => ({
  telemetry,
  layoutPreset: settings.layoutPreset,
});

export default connect(mapStateToProps)(TelemetryView);
