import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Heading from '../components/Heading';

class CameraView extends React.Component {
  constructor(props) {
    super(props);

    this.renderImage = this.renderImage.bind(this);

    this.state = {
      image: null
    };
  }

  componentDidMount() {
    this.renderImage();
  }

  static getDerivedStateFromProps(props) {
    const image = new Image();
    image.src = `data:image/jpeg;base64,${props.imageStr}`;
    return { image };
  }

  renderImage() {
    const { image } = this.state;

    if (this.canvas && image.width != 0 && image.height != 0) {
      const viewportWidth = Math.min(this.canvas.parentElement.parentElement.clientWidth - 32, 1000);
      const viewportHeight = Math.min(this.canvas.parentElement.parentElement.clientHeight - 50, 1000);

      const scale = Math.min(1.0, viewportWidth / image.width, viewportHeight / image.height);
      const x = (viewportWidth - scale * image.width) / 2;
      const y = (viewportHeight - scale * image.height) / 2;

      this.canvas.width = this.canvas.width;

      const ctx = this.canvas.getContext('2d');
      ctx.drawImage(this.state.image, x, y, scale * image.width, scale * image.height);
    }

    requestAnimationFrame(this.renderImage);
  }

  render() {
    return (
      <div style={{overflow: 'hidden', height: '100%'}}>
        <Heading level={2} text="Camera" />
        <canvas ref={(c) => { this.canvas = c; }} width="1000" height="1000" />
      </div>
    );
  }
}

CameraView.propTypes = {
  imageStr: PropTypes.string.isRequired
};

const mapStateToProps = ({ camera }) => ({
  imageStr: camera.imageStr
});

export default connect(mapStateToProps)(CameraView);
