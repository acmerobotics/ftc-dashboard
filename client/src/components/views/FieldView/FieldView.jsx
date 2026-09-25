import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import BaseView, { BaseViewHeading } from '@/components/views/BaseView';
import ReplayBadge from '@/components/views/ReplayBadge';
import { GHOST_RESET } from '@/store/recording/ghosts';
import Field from './Field';
import AutoFitCanvas from '@/components/Canvas/AutoFitCanvas';

class FieldView extends React.Component {
  constructor(props) {
    super(props);

    this.canvasRef = React.createRef();

    this.renderField = this.renderField.bind(this);

    this.overlay = {
      bg: [],
      ops: [],
    };
  }

  componentDidMount() {
    this.field = new Field(this.canvasRef.current);
    // Seeded from the store, or a tile added while the stream is idle (paused
    // replay, stalled socket) stays blank until the next batch arrives.
    this.syncOverlay();
  }

  componentDidUpdate(prevProps) {
    if (
      this.props.telemetry === prevProps.telemetry &&
      this.props.replay === prevProps.replay &&
      this.props.foldToken === prevProps.foldToken
    )
      return;

    // Comes in the same render as the batch after it, so an empty batch sent
    // alongside it would never be seen.
    if (this.props.foldToken !== prevProps.foldToken) {
      this.overlay = { bg: [], ops: [] };
    }
    this.syncOverlay();
  }

  syncOverlay() {
    const replayOps = this.props.replay.ops;

    // Background (`field`) and drawing (`fieldOverlay`) kept apart so the ghost
    // can layer between them. The server keeps `field` on the packet that keeps
    // the overlay, so an empty one there is `new TelemetryPacket(false)`.
    this.overlay = this.props.telemetry.reduce(
      (acc, { field, fieldOverlay }) =>
        fieldOverlay.ops.length === 0
          ? acc
          : { bg: field.ops, ops: fieldOverlay.ops },
      this.overlay,
    );

    this.field.setOverlay({
      ...this.overlay,
      ops: [
        ...(this.overlay.bg ?? []),
        ...replayOps,
        ...(replayOps.length > 0 ? GHOST_RESET : []),
        ...this.overlay.ops,
      ],
    });
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
          {this.props.playbackMode === 'playback' && (
            <ReplayBadge source="replacing" />
          )}
          {this.props.playbackMode === 'ghost' && (
            <ReplayBadge
              source="alongside"
              count={1 + this.props.overlayCount}
            />
          )}
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
  replay: PropTypes.object.isRequired,
  playbackMode: PropTypes.string.isRequired,
  foldToken: PropTypes.number.isRequired,
  overlayCount: PropTypes.number.isRequired,
  isDraggable: PropTypes.bool,
  isUnlocked: PropTypes.bool,
};

const mapStateToProps = ({ telemetry, replay, playback }) => ({
  telemetry,
  replay,
  playbackMode: playback.mode,
  foldToken: playback.foldToken,
  overlayCount: playback.overlays.length,
});

export default connect(mapStateToProps)(FieldView);
