import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Heading from '../components/Heading';
import AutoFitCanvas from '../components/AutoFitCanvas';

class CameraView extends React.Component {
  constructor(props) {
    super(props);

    this.canvasRef = React.createRef();

    this.renderImage = this.renderImage.bind(this);

    this.image = new Image();
    this.image.onload = this.renderImage;
  }

  componentDidMount() {
    this.ctx = this.canvasRef.current.getContext('2d');
  }

  componentDidUpdate() {
    this.image.src = `data:image/jpeg;base64,${this.props.imageStr}`;
  }

  renderImage() {
    if (this.ctx) {
      const canvas = this.canvasRef.current;

      canvas.width = canvas.width; // clears the canvas

      const viewportWidth = canvas.width;
      const viewportHeight = canvas.height;

      // flip the image
      // TODO: is there a better way to handle orientation?
      const scale = Math.min(devicePixelRatio, viewportWidth / this.image.height, viewportHeight / this.image.width);
      this.ctx.translate(viewportWidth / 2, viewportHeight / 2);
      this.ctx.rotate(Math.PI / 2);
      this.ctx.scale(scale, scale);
      this.ctx.drawImage(this.image, -this.image.width / 2, -this.image.height / 2, this.image.width, this.image.height);
    }
  }

  render() {
    return (
      <div>
        <Heading level={2} text="Camera" />
        <div className="canvas-container">
          <AutoFitCanvas ref={this.canvasRef} onResize={this.renderImage} />
        </div>
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
