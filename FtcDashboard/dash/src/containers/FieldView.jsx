import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import Field from './Field';
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
      <div className="h-full px-4 py-2 bg-white bg-opacity-75">
        <h2
          className={`${
            this.props.isDraggable ? 'grab-handle' : ''
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
  isDraggable: PropTypes.bool,
};

const mapStateToProps = ({ telemetry }) => ({
  overlay: telemetry[telemetry.length - 1].fieldOverlay,
});

export default connect(mapStateToProps)(FieldView);
