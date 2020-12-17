import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import Field from './Field';
import AutoFitCanvas from '../components/AutoFitCanvas';

import LayoutPreset from '../enums/LayoutPreset';

class FieldView extends React.Component {
  constructor(props) {
    super(props);

    this.canvasRef = React.createRef();

    this.renderField = this.renderField.bind(this);
    this.layoutPreset = LayoutPreset.DEFAULT;
  }

  componentDidMount() {
    this.field = new Field(this.canvasRef.current);
    this.renderField();
  }

  componentDidUpdate() {
    this.field.setOverlay(this.props.overlay);
    this.renderField();
  }

  renderField() {
    if (this.field) {
      this.field.render();
    }
  }

  render() {
    return (
      <div style={{ height: '100%', padding: '1em', paddingTop: '0.5em' }}>
        <h2
          className={`${
            this.props.layoutPreset == LayoutPreset.CONFIGURABLE
              ? 'grab-handle'
              : ''
          } text-xl w-full py-2 font-bold`}
        >
          Field
        </h2>
        <AutoFitCanvas
          ref={this.canvasRef}
          onResize={this.renderField}
          containerHeight="calc(100% - 3em)"
        />
      </div>
    );
  }
}

FieldView.propTypes = {
  overlay: PropTypes.shape({
    ops: PropTypes.array.isRequired,
  }).isRequired,
  // This should be
  // PropTypes.oneOf(Object.keys(LayoutPreset)).isRequired
  // but for some reason it breaks
  layoutPreset: PropTypes.any,
};

const mapStateToProps = ({ telemetry, settings }) => ({
  overlay: telemetry[telemetry.length - 1].fieldOverlay,
  layoutPreset: settings.layoutPreset,
});

export default connect(mapStateToProps)(FieldView);
