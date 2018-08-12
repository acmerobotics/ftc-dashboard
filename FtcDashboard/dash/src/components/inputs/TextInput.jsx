import React from 'react';
import PropTypes from 'prop-types';

class TextInput extends React.Component {
  constructor(props) {
    super(props);

    this.handleChange = this.handleChange.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  handleChange(evt) {
    const validated = this.props.validate(evt.target.value);
    if (validated) {
      this.props.onChange(validated);
    }
  }

  handleKeyDown(evt) {
    if (evt.keyCode === 13) {
      this.props.onEnter();
    }
  }

  render() {
    return (
      <input
        className={ this.props.valid ? 'valid' : 'invalid' }
        type="text"
        size={15}
        value={this.props.value}
        onChange={this.handleChange}
        onKeyDown={this.handleKeyDown}
      />
    );
  }
}

TextInput.propTypes = {
  value: PropTypes.any.isRequired,
  valid: PropTypes.bool.isRequired,
  validate: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onEnter: PropTypes.func.isRequired
};

export default TextInput;
