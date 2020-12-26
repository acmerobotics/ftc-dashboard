import React from 'react';
import PropTypes from 'prop-types';

import Graph from './Graph';
import AutoFitCanvas from '../components/AutoFitCanvas';

import { ReactComponent as PauseSVG } from '../assets/icons/pause.svg';

class GraphCanvas extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      paused: false,
    };

    this.canvasRef = React.createRef();

    this.handleDocumentKeydown = this.handleDocumentKeydown.bind(this);
    this.renderGraph = this.renderGraph.bind(this);
  }

  componentDidMount() {
    this.graph = new Graph(this.canvasRef.current, this.props.options);
    this.renderGraph();

    document.addEventListener('keydown', this.handleDocumentKeydown);
  }

  componentWillUnmount() {
    if (this.requestId) {
      cancelAnimationFrame(this.requestId);
    }

    document.removeEventListener('keydown', this.handleDocumentKeydown);
  }

  componentDidUpdate() {
    this.props.data.forEach((sample) => this.graph.addSample(sample));
  }

  handleDocumentKeydown(evt) {
    if (evt.code === 'Space' || evt.key === 'k') {
      this.setState(
        {
          paused: !this.state.paused,
        },
        () => {
          this.renderGraph();
        },
      );
    }
  }

  renderGraph() {
    if (!this.state.paused && this.graph) {
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
          {this.graph === null || !this.graph?.hasGraphableContent ? (
            <p className="text-center">No content to graph</p>
          ) : null}
        </div>
        {this.state.paused ? (
          <PauseSVG className="w-20 h-20 absolute top-24 right-10" />
        ) : null}
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
};

export default GraphCanvas;
