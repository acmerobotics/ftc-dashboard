import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';

import AutoFitCanvas from '../components/AutoFitCanvas';
import IconGroup from '../components/IconGroup';
import Icon from '../components/Icon';

class CameraView extends React.Component {
  constructor(props) {
    super(props);

    this.canvasRef = React.createRef();

    this.renderImage = this.renderImage.bind(this);

    this.image = new Image();
    this.image.onload = this.renderImage;

    this.state = {
      rotation: 0,
    };
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

      // eslint-disable-next-line
      canvas.width = canvas.width; // clears the canvas

      const viewportWidth = canvas.width;
      const viewportHeight = canvas.height;

      // rotate the image
      const scale = Math.min(
        devicePixelRatio,
        (this.state.rotation % 2 === 0 ? viewportHeight : viewportWidth) /
          this.image.height,
        (this.state.rotation % 2 === 0 ? viewportWidth : viewportHeight) /
          this.image.width,
      );
      this.ctx.translate(viewportWidth / 2, viewportHeight / 2);
      this.ctx.rotate((this.state.rotation * Math.PI) / 2);
      this.ctx.scale(scale, scale);
      this.ctx.drawImage(
        this.image,
        -this.image.width / 2,
        -this.image.height / 2,
        this.image.width,
        this.image.height,
      );
    }
  }

  render() {
    return (
      <div className="px-4 py-2 bg-white bg-opacity-75">
        <div className="flex justify-between items-center">
          <h2
            className={`${
              this.props.isDraggable ? 'grab-handle' : ''
            } text-xl w-full py-2 font-bold`}
          >
            Camera
          </h2>
          <IconGroup>
            <Icon
              onClick={() =>
                this.setState({ rotation: (this.state.rotation + 1) % 4 })
              }
              icon="refresh"
              size="small"
            />
          </IconGroup>
        </div>
        <div className="canvas-container">
          <AutoFitCanvas ref={this.canvasRef} onResize={this.renderImage} />
        </div>
      </div>
    );
  }
}

CameraView.propTypes = {
  imageStr: PropTypes.string.isRequired,
  isDraggable: PropTypes.bool,
};

const mapStateToProps = ({ camera }) => ({
  imageStr: camera.imageStr,
});

export default connect(mapStateToProps)(CameraView);
