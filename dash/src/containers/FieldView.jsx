import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Field from './Field';
import Heading from '../components/Heading';

class FieldView extends React.Component {
  constructor(props) {
    super(props);

    this.renderField = this.renderField.bind(this);
  }

  componentDidMount() {
    this.field = new Field(this.canvas);
    this.renderField();
  }

  componentDidUpdate() {
    this.field.setOverlay(this.props.overlay);
  }

  renderField() {
    if (this.canvas) {
      this.field.render(0, 0,
        Math.min(this.canvas.parentElement.parentElement.clientWidth - 32, 1000),
        Math.min(this.canvas.parentElement.parentElement.clientHeight - 50, 1000));
      requestAnimationFrame(this.renderField);
    }
  }

  render() {
    return (
      <div style={{overflow: 'hidden', height: '100%'}}>
        <Heading level={2} text="Field" />
        <canvas ref={(c) => { this.canvas = c; }} width="1000" height="1000" />
      </div>
    );
  }
}

FieldView.propTypes = {
  overlay: PropTypes.shape({
    ops: PropTypes.array.isRequired
  }).isRequired
};

const mapStateToProps = ({ telemetry }) => ({
  overlay: telemetry.fieldOverlay
});

export default connect(mapStateToProps)(FieldView);
