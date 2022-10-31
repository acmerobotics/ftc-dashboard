import React from 'react';
import PropTypes from 'prop-types';

import Graph from './Graph';
import AutoFitCanvas from '../components/AutoFitCanvas';

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
  }

  componentWillUnmount() {
    if (this.requestId) {
      cancelAnimationFrame(this.requestId);
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.data === prevProps.data) return;

    this.graph.add(this.props.data);

    if (!this.props.paused && !this.requestId) {
      this.renderGraph();
    }
  }

  renderGraph() {
    if (this.props.paused) {
      this.requestId = 0;
    } else {
      this.setState(() => ({
        graphEmpty: !this.graph.render(),
      }));

      this.requestId = requestAnimationFrame(this.renderGraph);
    }
  }

  render() {
    return (
      <div className="h-full flex-center">
        <div
          className={`${this.state.graphEmpty ? 'hidden' : ''} w-full h-full`}
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
  data: PropTypes.arrayOf(PropTypes.any).isRequired,
  options: PropTypes.object.isRequired,
  paused: PropTypes.bool.isRequired,
};

export default GraphCanvas;
