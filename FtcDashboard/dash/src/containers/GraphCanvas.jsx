import React from 'react';
import PropTypes from 'prop-types';
import Graph from './Graph';
import AutoFitCanvas from '../components/AutoFitCanvas';

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
    this.props.data.forEach(sample => this.graph.addSample(sample));
  }

  handleDocumentKeydown(evt) {
    if (evt.code === 'Space') {
      this.setState({
        paused: !this.state.paused,
      }, () => {
        this.renderGraph();
      });
    }
  }

  renderGraph() {
    if (!this.state.paused && this.graph) {
      this.graph.render();
      this.requestId = requestAnimationFrame(this.renderGraph);
    }
  }

  render() {
    return <AutoFitCanvas ref={this.canvasRef} />;
  }
}

GraphCanvas.propTypes = {
  data: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    value: PropTypes.number
  }))).isRequired,
  options: PropTypes.object
};

export default GraphCanvas;
