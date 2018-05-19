import React from 'react';
import PropTypes from 'prop-types';

class DoubleInput extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      value: this.props.value,
      valid: true
    };

    this.handleChange = this.handleChange.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      value: nextProps.value,
      valid: true
    });
  }

  handleChange(evt) {
    if (evt.target.value === ''
        || /^-0?$/.test(evt.target.value)
        || /^-?\d*\.([1-9]*0+)*$/.test(evt.target.value)) {
      this.setState({
        value: evt.target.value,
        valid: false
      });
    } else if (/^-?\d*\.?\d*$/.test(evt.target.value)) {
      this.setState({
        value: evt.target.value,
        valid: true
      });
      this.props.onChange(parseFloat(evt.target.value));
    }
  }

  render() {
    return (
      <input
        className={ this.state.valid ? 'valid' : 'invalid' }
        type="text"
        size={15}
        value={this.state.value}
        onChange={this.handleChange}
      />
    );
  }
}

DoubleInput.propTypes = {
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired
};

export default DoubleInput;
