import React from 'react';
import PropTypes from 'prop-types';

import Graph from './Graph';
import GraphTooltip from './GraphTooltip';
import AutoFitCanvas from '@/components/Canvas/AutoFitCanvas';
import { isEqual } from 'lodash';

class GraphCanvas extends React.Component {
  constructor(props) {
    super(props);

    this.canvasRef = React.createRef();
    this.containerRef = React.createRef();

    this.renderGraph = this.renderGraph.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseLeave = this.handleMouseLeave.bind(this);

    this.unsubs = []; // unsub functions to be called to cleanup

    // time of the frame currently on the canvas
    this.lastRenderTimeMs = null;

    this.state = {
      graphEmpty: false,
      hover: null,
      containerWidth: 0,
      containerHeight: 0,
    };
  }

  componentDidMount() {
    this.graph = new Graph(this.canvasRef.current, this.props.options);
  }

  componentWillUnmount() {
    if (this.requestId) {
      cancelAnimationFrame(this.requestId);
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

    if (prevProps.paused && !this.props.paused) {
      this.graph.reset();
    }

    if (!this.props.paused && !isEqual(this.props.data, prevProps.data)) {
      this.graph.add(Date.now(), this.props.data);
    }

    if (!this.props.paused && !this.requestId) graphIsDirty = true;

    if (graphIsDirty) this.renderGraph();
  }

  // the graph reports hover positions in canvas space; the tooltip is
  // positioned in container space
  measureContainer() {
    const canvas = this.canvasRef.current;
    const container = this.containerRef.current;
    if (!canvas || !container) return;

    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    this.canvasOffset = {
      x: canvasRect.left - containerRect.left,
      y: canvasRect.top - containerRect.top,
    };

    this.setState({
      containerWidth: containerRect.width,
      containerHeight: containerRect.height,
    });
  }

  // the animation loop is stopped while paused, so hovering has to redraw itself
  renderPausedFrame() {
    if (!this.graph) return;

    this.measureContainer();

    // rendering prunes samples that have fallen out of the window, so a frozen
    // frame has to be redrawn at the time it was first drawn at
    const time = this.lastRenderTimeMs ?? this.props.pausedTime;
    this.lastRenderTimeMs = time;

    this.setState({
      graphEmpty: !this.graph.render(time),
      hover: this.graph.getHover(),
    });
  }

  handleMouseMove(evt) {
    const canvas = this.canvasRef.current;
    if (!this.graph || !canvas) return;

    const canvasRect = canvas.getBoundingClientRect();

    this.graph.setCursor({
      x: evt.clientX - canvasRect.left,
      y: evt.clientY - canvasRect.top,
    });

    if (this.props.paused) {
      this.renderPausedFrame();
    } else {
      this.measureContainer();
    }
  }

  handleMouseLeave() {
    if (!this.graph) return;

    this.graph.setCursor(null);

    if (this.props.paused) {
      this.renderPausedFrame();
    } else {
      this.setState({ hover: null });
    }
  }

  renderGraph() {
    if (this.props.paused) {
      this.requestId = 0;
    } else {
      const time = Date.now();
      this.lastRenderTimeMs = time;

      this.setState(() => ({
        graphEmpty: !this.graph.render(time),
        hover: this.graph.getHover(),
      }));

      this.requestId = requestAnimationFrame(this.renderGraph);
    }
  }

  render() {
    const { hover } = this.state;
    const offset = this.canvasOffset ?? { x: 0, y: 0 };

    return (
      <div className="flex-center relative h-full" ref={this.containerRef}>
        <div
          className={`${
            this.state.graphEmpty ? 'hidden' : ''
          } h-full w-full cursor-crosshair`}
          onMouseMove={this.handleMouseMove}
          onMouseLeave={this.handleMouseLeave}
        >
          <AutoFitCanvas
            ref={this.canvasRef}
            onResize={() => {
              if (this.props.paused) this.renderPausedFrame();
              else this.measureContainer();
            }}
          />
        </div>
        {hover && (
          <GraphTooltip
            hover={{
              ...hover,
              cursorX: hover.cursorX + offset.x,
              cursorY: hover.cursorY + offset.y,
            }}
            width={this.state.containerWidth}
            height={this.state.containerHeight}
          />
        )}
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
  data: PropTypes.arrayOf(PropTypes.any).isRequired,
  options: PropTypes.object.isRequired,
  paused: PropTypes.bool.isRequired,
  pausedTime: PropTypes.number.isRequired,
};

export default GraphCanvas;
