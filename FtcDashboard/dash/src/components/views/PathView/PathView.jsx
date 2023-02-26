import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import BaseView, { BaseViewHeading } from '@/components/views/BaseView';
import Field from '@/components/views/FieldView/Field';
import AutoFitCanvas from '@/components/Canvas/AutoFitCanvas';

class PathView extends React.Component {
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
      <BaseView isUnlocked={this.props.isUnlocked}>
        <BaseViewHeading isDraggable={this.props.isDraggable}>
          Draw a Path
        </BaseViewHeading>
        <AutoFitCanvas
          ref={this.canvasRef}
          onResize={this.renderField}
          containerHeight="calc(100% - 3em)"
        />
      </BaseView>
    );
  }
}

PathView.propTypes = {
  overlay: PropTypes.shape({
    ops: PropTypes.array.isRequired,
  }).isRequired,

  isDraggable: PropTypes.bool,
  isUnlocked: PropTypes.bool,
};

const mapStateToProps = ({ telemetry }) => ({
  overlay: telemetry[telemetry.length - 1].fieldOverlay,
});

export default connect(mapStateToProps)(PathView);
