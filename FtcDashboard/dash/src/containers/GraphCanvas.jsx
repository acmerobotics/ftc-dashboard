import React from 'react';
import PropTypes from 'prop-types';

import Graph from './Graph';
import AutoFitCanvas from '../components/AutoFitCanvas';

class GraphCanvas extends React.Component {
  constructor(props) {
    super(props);

    this.canvasRef = React.createRef();

    this.renderGraph = this.renderGraph.bind(this);
  }

  componentDidMount() {
    this.graph = new Graph(this.canvasRef.current, this.props.options);
    this.renderGraph();
  }

  componentWillUnmount() {
    if (this.requestId) {
      cancelAnimationFrame(this.requestId);
    }
  }

  componentDidUpdate(prevProps) {
    this.props.data
      .filter((e) => e.length > 1)
      .forEach((sample) => this.graph.addSample(sample));

    if (prevProps.paused !== this.props.paused) {
      if (this.requestId) cancelAnimationFrame(this.requestId);

      if (!this.props.paused) this.renderGraph();
    }
  }

  renderGraph() {
    if (!this.props.paused && this.graph) {
      this.graph.render();
      this.requestId = requestAnimationFrame(this.renderGraph);
    }
  }

  render() {
    return (
      <div className="h-full flex-center">
        <div
          className={`${
            this.graph === null || !this.graph?.hasGraphableContent
              ? 'hidden'
              : ''
          } w-full h-full`}
        >
          <AutoFitCanvas ref={this.canvasRef} />
        </div>
        <div className="absolute top-0 left-0 w-full h-full flex-center pointer-events-none">
          {(this.graph === null || !this.graph?.hasGraphableContent) && (
            <p className="text-center">No content to graph</p>
          )}
        </div>
      </div>
    );
  }
}

GraphCanvas.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string,
        value: PropTypes.number,
      }),
    ),
  ).isRequired,
  options: PropTypes.object,
  paused: PropTypes.bool,
};

export default GraphCanvas;
