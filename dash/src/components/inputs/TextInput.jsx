import React from 'react';
import PropTypes from 'prop-types';

class TextInput extends React.Component {
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
    const validated = this.props.validate(evt.target.value);
    this.setState(validated);
    if (validated.valid) {
      this.props.onChange(validated.value);
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

TextInput.propTypes = {
  value: PropTypes.any.isRequired,
  validate: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default TextInput;