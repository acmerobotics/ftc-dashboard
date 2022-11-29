import React from 'react';
import PropTypes from 'prop-types';

class TextInput extends React.Component {
  constructor(props) {
    super(props);

    this.inputRef = React.createRef();

    this.handleChange = this.handleChange.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);

    this.state = { value: props.value };
  }

  componentDidUpdate() {
    this.inputRef.current.setCustomValidity(
      this.props.valid ? '' : 'Invalid input',
    );

    if (this.props.value !== this.props.validate(this.state.value).value)
      this.setState({ value: this.props.value });
  }

  handleChange(evt) {
    this.setState({ value: evt.target.value });

    const validated = this.props.validate(evt.target.value);

    if (validated) {
      this.props.onChange(validated);
    }
  }

  handleKeyDown(evt) {
    if (this.props.onSave && evt.keyCode === 13) {
      this.props.onSave();
    }
  }

  render() {
    return (
      <input
        className={`bg-gray-100 rounded border border-gray-200 px-3 py-1 ${
          !this.props.valid
            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
            : ''
        }`}
        ref={this.inputRef}
        type="text"
        size={15}
        value={this.state.value}
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
  onSave: PropTypes.func,
};

export default TextInput;
