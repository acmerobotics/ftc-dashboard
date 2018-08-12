import React from 'react';
import PropTypes from 'prop-types';

class MultipleCheckbox extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selected: this.props.selected || [],
    };
  }

  handleChange(evt, val) {
    if (evt.target.checked) {
      this.setState({
        selected: [...this.state.selected, val],
      }, () => this.props.onChange(this.state.selected));
    } else {
      this.setState({
        selected: this.state.selected.filter(el => val !== el),
      }, () => this.props.onChange(this.state.selected));
    }
  }

  render() {
    return (
      <table className="multiple-checkbox">
        <tbody>
          {
            this.props.arr
              .filter(val => !this.props.exclude || this.props.exclude.indexOf(val) === -1)
              .map(val => (
                <tr key={val}>
                  <td>
                    <input
                      type="checkbox"
                      onChange={evt => this.handleChange(evt, val)}
                      checked={this.state.selected.indexOf(val) !== -1} />
                  </td>
                  <td>{val}</td>
                </tr>
              ))
          }
        </tbody>
      </table>
    );
  }
}

MultipleCheckbox.propTypes = {
  arr: PropTypes.arrayOf(PropTypes.string).isRequired,
  selected: PropTypes.arrayOf(PropTypes.string),
  exclude: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func // TODO: fix!
};

export default MultipleCheckbox;
