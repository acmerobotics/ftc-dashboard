import React from 'react';
import PropTypes from 'prop-types';

import Graph from './Graph';
import AutoFitCanvas from '../components/AutoFitCanvas';
import { keys } from 'lodash';
import { subToNumericTelemetryStream } from '../store/middleware/socketMiddleware';

// PureComponent implements shouldComponentUpdate()
class GraphCanvas extends React.PureComponent {
  constructor(props) {
    super(props);

    this.canvasRef = React.createRef();

    this.renderGraph = this.renderGraph.bind(this);

    this.unsubs = []; // unsub functions to be called to cleanup

    this.state = {
      graphEmpty: false,
    };
  }

  componentDidMount() {
    this.graph = new Graph(this.canvasRef.current, this.props.options);
    this.renderGraph();
  }

  componentWillUnmount() {
    if (this.requestId) {
      cancelAnimationFrame(this.requestId);
    }

    for (let unsub of this.unsubs) {
      unsub();
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.keys !== prevProps.keys) {
      for (const unsub of this.unsubs) {
        unsub();
      }

      const data = {};
      this.unsubs = [];
      for (const k of this.props.keys) {
        const { ts, vs, unsub } = subToNumericTelemetryStream(k);

        data[k] = { ts, vs };
        this.unsubs.push(unsub);
      }

      this.graph.setData(data);
    }
  }

  renderGraph() {
    if (!this.props.paused && this.graph) {
      this.setState(() => ({
        graphEmpty: !this.graph.render()
      }));

      this.requestId = requestAnimationFrame(this.renderGraph);
    }
  }

  render() {
    return (
      <div className="h-full flex-center">
        <div
          className={`${
            this.state.graphEmpty ? 'hidden' : ''
          } w-full h-full`}
        >
          <AutoFitCanvas ref={this.canvasRef} />
        </div>
        <div className="absolute top-0 left-0 w-full h-full flex-center pointer-events-none">
          {this.state.graphEmpty && (
            <p className="text-center">No content to graph</p>
          )}
        </div>
      </div>
    );
  }
}

GraphCanvas.propTypes = {
  keys: PropTypes.arrayOf(PropTypes.string).isRequired,
  options: PropTypes.object.isRequired,
  paused: PropTypes.bool.isRequired,
};

export default GraphCanvas;
