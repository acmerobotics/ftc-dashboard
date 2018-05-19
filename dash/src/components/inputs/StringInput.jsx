import React from 'react';
import PropTypes from 'prop-types';

class StringInput extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      value: this.props.value
    };

    this.handleChange = this.handleChange.bind(this);
  }

  componentWillReceiveProps() {
    this.setState({
      value: this.props.value
    });
  }

  handleChange(evt) {
    this.setState({
      value: evt.target.value
    });

    this.props.onChange(evt.target.value);
  }

  render() {
    return (
      <input
        className="valid"
        type="text"
        size={30}
        value={this.state.value}
        onChange={this.handleChange}
      />
    );
  }
}

StringInput.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired
};

export default StringInput;
