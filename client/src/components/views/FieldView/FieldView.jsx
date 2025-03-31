import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import BaseView, { BaseViewHeading } from '@/components/views/BaseView';
import Field from './Field';
import AutoFitCanvas from '@/components/Canvas/AutoFitCanvas';

class FieldView extends React.Component {
  constructor(props) {
    super(props);

    this.canvasRef = React.createRef();

    this.renderField = this.renderField.bind(this);

    this.overlay = {
      ops: [],
    };
  }

  componentDidMount() {
    this.field = new Field(this.canvasRef.current);
    this.renderField();
  }

  componentDidUpdate(prevProps) {
    if (this.props.telemetry === prevProps.telemetry && this.props.replay === prevProps.replay) return;

    this.overlay = this.props.telemetry.reduce((acc, { field, fieldOverlay }) => ({
      ops: [
        ...acc.ops,
        ...(field?.ops || []),
        ...(fieldOverlay?.ops || []),
      ],
    }), { ops: [] });

    // Merge telemetry and replay
    if (this.overlay.ops.length === 0) {
       this.overlay.ops = [
         ...this.overlay.ops,
         ...(this.props.replay?.field?.ops || []), // Add replay field.ops if ops is empty
       ];
     }

     // Merge telemetry and replay
     this.overlay.ops = [
       ...this.overlay.ops,
       ...(this.props.replay?.ops || []), // Add replay ops if available
     ];


    this.field.setOverlay(this.overlay);
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
          Field
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

FieldView.propTypes = {
  telemetry: PropTypes.arrayOf(PropTypes.object).isRequired,
  replayOps: PropTypes.arrayOf(PropTypes.object),
  isDraggable: PropTypes.bool,
  isUnlocked: PropTypes.bool,
};

const mapStateToProps = ({ telemetry, replay }) => ({
  telemetry,
  replay,
});

export default connect(mapStateToProps)(FieldView);
