import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import Heading from '../components/Heading';
import MultipleCheckbox from '../components/MultipleCheckbox';
import GraphCanvas from './GraphCanvas';
import IconGroup from '../components/IconGroup';
import Icon from '../components/Icon';

class GraphView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      graphing: false,
      keys: [],
    };

    this.divRef = React.createRef();

    this.handleClick = this.handleClick.bind(this);
  }

  startGraphing() {
    this.setState({
      graphing: true,
    });

    this.divRef.current.scrollTop = 0;
    this.divRef.current.scrollLeft = 0;
  }

  stopGraphing() {
    this.setState({
      graphing: false,
    });
  }

  handleClick() {
    if (this.state.graphing) {
      this.stopGraphing();
    } else {
      this.startGraphing();
    }
  }

  render() {
    return (
      <div style={{overflow: this.state.graphing ? 'hidden' : 'auto', height: '100%'}} ref={this.divRef}>
        <Heading level={2} text="Graph">
          <IconGroup>
            <Icon
              icon={this.state.graphing ? 'close' : 'chart'}
              size="small"
              onClick={this.handleClick} />
          </IconGroup>
        </Heading>
        {
          this.state.graphing ?
            <GraphCanvas
              timestamp={this.props.timestamp}
              items={Object.keys(this.props.data)
                .filter(key => this.state.keys.indexOf(key) !== -1)
                .map(key => ({
                  caption: key,
                  value: this.props.data[key]
                }))} />
            :
            (
              <MultipleCheckbox
                arr={Object.keys(this.props.data)
                  .filter(key => !isNaN(parseFloat(this.props.data[key])))}
                onChange={selected => this.setState({ keys: selected })}
                selected={this.state.keys} />
            )
        }
      </div>
    );
  }
}

GraphView.propTypes = {
  timestamp: PropTypes.number.isRequired,
  data: PropTypes.object.isRequired,
};

const mapStateToProps = ({ telemetry }) => ({
  timestamp: telemetry.timestamp,
  data: telemetry.data
});

export default connect(mapStateToProps)(GraphView);
