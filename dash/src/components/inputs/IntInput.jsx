import React from 'react';
import PropTypes from 'prop-types';

class IntInput extends React.Component {
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
    if (evt.target.value === '-' || evt.target.value === '') {
      this.setState({
        value: evt.target.value,
        valid: false
      });
    } else if (/^-?\d*$/.test(evt.target.value)) {
      this.setState({
        value: evt.target.value,
        valid: true
      });
      this.props.onChange(parseInt(evt.target.value, 10));
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

IntInput.propTypes = {
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired
};

export default IntInput;
