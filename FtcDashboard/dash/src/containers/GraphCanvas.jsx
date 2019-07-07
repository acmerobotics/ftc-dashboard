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
    document.removeEventListener('keydown', this.handleDocumentKeydown);
  }

  componentDidUpdate() {
    if (this.props.items.length > 0) {
      this.graph.addData([
        ...this.props.items.map(({ caption, value }) => ({
          name: caption,
          value: parseFloat(value)
        })),
        {
          name: 'time',
          value: this.props.timestamp
        }
      ]);
    }
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
      requestAnimationFrame(this.renderGraph);
    }
  }

  render() {
    return <AutoFitCanvas ref={this.canvasRef} onResize={this.renderGraph} />;
  }
}

const itemPropType = PropTypes.shape({
  caption: PropTypes.string,
  value: PropTypes.string
});

GraphCanvas.propTypes = {
  timestamp: PropTypes.number.isRequired,
  items: PropTypes.arrayOf(itemPropType).isRequired,
  options: PropTypes.object
};

export default GraphCanvas;
