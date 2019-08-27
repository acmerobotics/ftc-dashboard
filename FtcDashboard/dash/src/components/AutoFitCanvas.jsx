import React from 'react';
import PropTypes from 'prop-types';

class AutoFitCanvas extends React.Component {
  constructor(props) {
    super(props);

    this.resize = this.resize.bind(this);
  }

  componentDidMount() {
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.resize);
  }

  resize() {
    const canvas = this.props.innerRef.current;
    canvas.width = canvas.parentElement.clientWidth * devicePixelRatio;
    canvas.height = canvas.parentElement.clientHeight * devicePixelRatio;
    canvas.style.width = `${canvas.width / devicePixelRatio}px`;
    canvas.style.height = `${canvas.height / devicePixelRatio}px`;

    if (this.props.onResize) {
      this.props.onResize();
    }
  }

  render() {
    return <canvas ref={this.props.innerRef} />;
  }
}

AutoFitCanvas.propTypes = {
  innerRef: PropTypes.any.isRequired,
  onResize: PropTypes.func
};

const ForwardedAutoFitCanvas = React.forwardRef((props, ref) => <AutoFitCanvas innerRef={ref} {...props} />);
ForwardedAutoFitCanvas.displayName = 'AutoFitCanvas';
export default ForwardedAutoFitCanvas;
