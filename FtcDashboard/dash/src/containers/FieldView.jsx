import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Field from './Field';
import Heading from '../components/Heading';
import AutoFitCanvas from '../components/AutoFitCanvas';

class FieldView extends React.Component {
  constructor(props) {
    super(props);

    this.canvasRef = React.createRef();

    this.renderField = this.renderField.bind(this);
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
      <div>
        <Heading level={2} text="Field" />
        <div className="canvas-container">
          <AutoFitCanvas ref={this.canvasRef} onResize={this.renderField} />
        </div>
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
  overlay: telemetry[telemetry.length - 1].fieldOverlay
});

export default connect(mapStateToProps)(FieldView);
