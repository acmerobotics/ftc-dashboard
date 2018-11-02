import React from 'react';
import PropTypes from 'prop-types';
import Graph from './Graph';

class GraphCanvas extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      paused: false,
    };

    this.handleDocumentKeydown = this.handleDocumentKeydown.bind(this);
    this.renderGraph = this.renderGraph.bind(this);
  }

  componentDidMount() {
    this.graph = new Graph(this.canvas);
    this.renderGraph();
    document.addEventListener('keydown', this.handleDocumentKeydown);
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

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleDocumentKeydown);
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
    if (!this.state.paused && this.canvas) {
      this.graph.render(0, 0,
        Math.min(this.canvas.parentElement.parentElement.clientWidth - 32, 2500),
        Math.min(this.canvas.parentElement.parentElement.clientHeight - 64, 2500));
      requestAnimationFrame(this.renderGraph);
    }
  }

  render() {
    return <canvas ref={(c) => { this.canvas = c; }} width="2500" height="2500" />;
  }
}

const itemPropType = PropTypes.shape({
  caption: PropTypes.string,
  value: PropTypes.string
});

GraphCanvas.propTypes = {
  timestamp: PropTypes.number.isRequired,
  items: PropTypes.arrayOf(itemPropType).isRequired
};

export default GraphCanvas;
