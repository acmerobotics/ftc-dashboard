import React from 'react';
import PropTypes from 'prop-types';

import Graph from './Graph';
import AutoFitCanvas from '@/components/Canvas/AutoFitCanvas';
import { isEqual } from 'lodash';

// how close (in CSS pixels) a press must land to a marker to remove it
const MARKER_HIT_RADIUS = 8;

// approximate size of the label input, in CSS pixels; only used to keep it
// from hanging off the edge of the canvas
const DRAFT_WIDTH = 128;
const DRAFT_HEIGHT = 26;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

class GraphCanvas extends React.Component {
  constructor(props) {
    super(props);

    this.canvasRef = React.createRef();
    this.wrapperRef = React.createRef();
    this.draftRef = React.createRef();

    // a live graph moves a marker away between the press and the click
    this.pressedMarker = null;
    this.pressedInDraft = false;

    this.renderGraph = this.renderGraph.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleDraftChange = this.handleDraftChange.bind(this);
    this.handleDraftKeydown = this.handleDraftKeydown.bind(this);

    this.unsubs = []; // unsub functions to be called to cleanup

    this.state = {
      graphEmpty: false,
      // the marker being labeled by the user, if any
      markerDraft: null,
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
      this.graph.add(Date.now(), this.props.data, this.props.markers);
    }

    if (!this.props.paused && !this.requestId) graphIsDirty = true;

    if (graphIsDirty) this.renderGraph();
  }

  // the animation loop is stopped while paused, so marker edits have to be
  // drawn by hand to show up
  redrawIfPaused() {
    if (this.props.paused) this.graph.render(this.props.pausedTime);
  }

  // the view's shortcuts listen on an ancestor, so focus comes back here
  closeDraft(refocus = true) {
    if (!this.state.markerDraft) return;

    this.setState({ markerDraft: null }, () => {
      if (refocus) this.wrapperRef.current?.focus({ preventScroll: true });
    });
  }

  canvasCoords(evt) {
    const canvasRect = this.canvasRef.current.getBoundingClientRect();
    return {
      x: evt.clientX - canvasRect.left,
      y: evt.clientY - canvasRect.top,
    };
  }

  handleMouseDown(evt) {
    this.pressedMarker = null;
    this.pressedInDraft =
      this.draftRef.current !== null &&
      this.draftRef.current.contains(evt.target);

    if (!this.graph || this.pressedInDraft) return;

    const { x, y } = this.canvasCoords(evt);
    if (!this.graph.isInPlot(x, y)) return;

    this.pressedMarker = this.graph.markerAt(x, MARKER_HIT_RADIUS);
  }

  handleClick(evt) {
    const { pressedMarker, pressedInDraft } = this;
    this.pressedMarker = null;
    this.pressedInDraft = false;

    if (!this.graph || pressedInDraft) return;

    if (pressedMarker !== null) {
      this.graph.removeMarker(pressedMarker);
      this.closeDraft();
      this.redrawIfPaused();
      return;
    }

    const { x, y } = this.canvasCoords(evt);
    if (!this.graph.isInPlot(x, y)) return;

    const marker = this.graph.addMarker(this.graph.timeAtX(x), '');
    if (marker === null) return;

    // the draft input is positioned against the clicked element, and kept
    // inside of it so that it stays on screen near the edges
    const hostRect = evt.currentTarget.getBoundingClientRect();
    this.setState({
      markerDraft: {
        x: clamp(
          evt.clientX - hostRect.left,
          0,
          Math.max(0, hostRect.width - DRAFT_WIDTH),
        ),
        y: clamp(
          evt.clientY - hostRect.top,
          0,
          Math.max(0, hostRect.height - DRAFT_HEIGHT),
        ),
        marker,
        label: '',
      },
    });
    this.redrawIfPaused();
  }

  handleDraftChange(evt) {
    const { markerDraft } = this.state;
    if (!markerDraft) return;

    const label = evt.target.value;
    markerDraft.marker.label = label;

    this.setState({ markerDraft: { ...markerDraft, label } });
    this.redrawIfPaused();
  }

  handleDraftKeydown(evt) {
    // the enclosing view treats space and k as play/pause shortcuts
    evt.stopPropagation();

    const { markerDraft } = this.state;
    if (!markerDraft) return;

    if (evt.key === 'Enter') {
      this.closeDraft();
    } else if (evt.key === 'Escape') {
      this.graph.removeMarker(markerDraft.marker);
      this.closeDraft();
      this.redrawIfPaused();
    }
  }

  renderGraph() {
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
    const { markerDraft } = this.state;

    // the plot is hidden when the graph runs empty, which would drop focus
    return (
      <div
        ref={this.wrapperRef}
        className="flex-center h-full focus:outline-none"
        tabIndex={-1}
      >
        <div
          className={`${
            this.state.graphEmpty ? 'hidden' : ''
          } relative h-full w-full cursor-crosshair`}
          onClick={this.handleClick}
          onMouseDown={this.handleMouseDown}
        >
          <AutoFitCanvas
            ref={this.canvasRef}
            onResize={() => {
              if (this.graph && this.props.paused)
                this.graph.render(this.props.pausedTime);
            }}
          />
          {markerDraft && (
            <input
              // remount on a new spot so that autoFocus fires again
              key={`${markerDraft.x},${markerDraft.y}`}
              ref={this.draftRef}
              autoFocus
              className="absolute z-10 w-32 cursor-text rounded border border-gray-300 bg-white px-1 text-sm text-gray-900 shadow dark:border-slate-500 dark:bg-slate-700 dark:text-slate-100"
              style={{ left: markerDraft.x, top: markerDraft.y }}
              value={markerDraft.label}
              placeholder="Marker label"
              onChange={this.handleDraftChange}
              onKeyDown={this.handleDraftKeydown}
              onBlur={(evt) => this.closeDraft(evt.relatedTarget === null)}
            />
          )}
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

GraphCanvas.defaultProps = {
  markers: [],
};

GraphCanvas.propTypes = {
  data: PropTypes.arrayOf(PropTypes.any).isRequired,
  markers: PropTypes.arrayOf(PropTypes.any),
  options: PropTypes.object.isRequired,
  paused: PropTypes.bool.isRequired,
  pausedTime: PropTypes.number.isRequired,
};

export default GraphCanvas;
