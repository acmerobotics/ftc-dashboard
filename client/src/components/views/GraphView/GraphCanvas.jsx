import React from 'react';
import PropTypes from 'prop-types';

import Graph from './Graph';
import AutoFitCanvas from '@/components/Canvas/AutoFitCanvas';
import { isEqual } from 'lodash';

class GraphCanvas extends React.Component {
  constructor(props) {
    super(props);

    this.canvasRef = React.createRef();

    this.renderGraph = this.renderGraph.bind(this);

    this.unsubs = []; // unsub functions to be called to cleanup

    this.lastRenderMs = undefined;

    this.state = {
      graphEmpty: false,
    };
  }

  componentDidMount() {
    this.graph = new Graph(this.canvasRef.current, this.props.options);
  }

  componentWillUnmount() {
    if (this.requestId) {
      cancelAnimationFrame(this.requestId);
      this.requestId = 0;
    }
  }

  // TODO: Regretably, the current design requires that this.graph.add() only be called
  // once for each batch of telemetry. Violations of this contract cause artifacts in the
  // graph from out-of-order samples. (The graph code could be made more robust here, but
  // mitigating the issue here works just as well.)
  componentDidUpdate(prevProps) {
    let graphIsDirty = false;

    if (!isEqual(this.props.options, prevProps.options)) {
      this.graph.setOptions({
        ...this.graph.getOptions(),
        ...this.props.options,
      });
      graphIsDirty = true;
    }

    if (!prevProps.paused && this.props.paused) this.frozenAt = Date.now();
    if (prevProps.paused && !this.props.paused) {
      if (!this.props.replayDriven) {
        this.graph.reset();
      } else if (!prevProps.userPaused) {
        // The recording paused too, so what is plotted moves up to meet it.
        this.graph.shift(Date.now() - (this.frozenAt ?? Date.now()));
      }
    }

    // Before the add below: a seek re-sends history older than what is plotted.
    const didReset = prevProps.resetToken !== this.props.resetToken;
    if (didReset) {
      this.graph.reset();
      this.lastRenderMs = undefined;
    } else if (prevProps.showRecorded && !this.props.showRecorded) {
      this.graph.dropRecorded();
      graphIsDirty = true;
    }

    const dataChanged = !isEqual(this.props.data, prevProps.data);

    if (!this.props.paused && dataChanged) {
      this.graph.add(Date.now(), this.props.data);
    }

    // With the RAF loop stopped this is the only place a paused plot repaints.
    // The panel's own Pause holds it still as the replay plays, but not a seek.
    if (
      this.props.replayDriven &&
      this.props.paused &&
      (didReset || (dataChanged && !this.props.userPaused))
    ) {
      const now = Date.now();
      // onResize needs this: pausedTime is nowhere near a scrubbed playhead.
      this.lastRenderMs = now;
      this.frozenAt = now;
      this.graph.add(now, this.props.data);
      this.setState(() => ({
        graphEmpty: !this.graph.render(now),
      }));
    }

    if (!this.props.paused && !this.requestId) graphIsDirty = true;

    if (graphIsDirty) this.renderGraph();
  }

  renderGraph() {
    // Must be idempotent: a second chain overwrites the stored id, and unmount
    // can only cancel the id it can see, so the orphan renders on forever.
    if (this.requestId) cancelAnimationFrame(this.requestId);

    if (this.props.paused) {
      this.requestId = 0;
    } else {
      this.setState(() => ({
        graphEmpty: !this.graph.render(Date.now()),
      }));

      this.requestId = requestAnimationFrame(this.renderGraph);
    }
  }

  render() {
    return (
      <div className="flex-center h-full">
        <div
          className={`${this.state.graphEmpty ? 'hidden' : ''} h-full w-full`}
        >
          <AutoFitCanvas
            ref={this.canvasRef}
            onResize={() => {
              if (this.graph && this.props.paused) {
                this.graph.render(this.lastRenderMs ?? this.props.pausedTime);
              }
            }}
          />
        </div>
        <div className="flex-center pointer-events-none absolute top-0 left-0 h-full w-full">
          {this.state.graphEmpty && (
            <p className="text-center">No content to graph</p>
          )}
        </div>
      </div>
    );
  }
}

GraphCanvas.propTypes = {
  showRecorded: PropTypes.bool,
  replayDriven: PropTypes.bool,
  data: PropTypes.arrayOf(PropTypes.any).isRequired,
  options: PropTypes.object.isRequired,
  paused: PropTypes.bool.isRequired,
  userPaused: PropTypes.bool,
  pausedTime: PropTypes.number.isRequired,
  resetToken: PropTypes.number,
};

export default GraphCanvas;
