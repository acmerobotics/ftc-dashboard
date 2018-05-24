import React from 'react';
import PropTypes from 'prop-types';
import BooleanInput from '../components/inputs/BooleanInput';
import EnumInput from '../components/inputs/EnumInput';
import TextInput from '../components/inputs/TextInput';
import OptionType from '../enums/OptionType';
import { validateDouble, validateInt, validateString } from '../components/inputs/validate';

class BasicOption extends React.Component {
  render() {
    const { name, value, modifiedValue, schema } = this.props;

    const type = OptionType.getFromSchema(schema);

    const newValue = modifiedValue || value;
    const modified = newValue !== value;

    const onEnter = () => this.props.onSave(newValue);

    let input;

    switch (type) {
    case OptionType.INT:
      input = <TextInput value={newValue} validate={validateInt} onChange={this.props.onChange} onEnter={onEnter} />;
      break;
    case OptionType.DOUBLE:
      input = <TextInput value={newValue} validate={validateDouble} onChange={this.props.onChange} onEnter={onEnter} />;
      break;
    case OptionType.STRING:
      input = <TextInput value={newValue} validate={validateString} onChange={this.props.onChange} onEnter={onEnter} />;
      break;
    case OptionType.BOOLEAN:
      input = <BooleanInput value={newValue} onChange={this.props.onChange} />;
      break;
    case OptionType.ENUM:
      input = <EnumInput value={newValue} values={schema.values} onChange={this.props.onChange} />;
      break;
    default:
      input = <p>Unknown option type: {type}</p>;
    }

    return (
      <tr>
        <td>{modified ? '*' : ''}{name}</td>
        <td>{input}</td>
      </tr>
    );
  }
}

BasicOption.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.any.isRequired,
  modifiedValue: PropTypes.any,
  schema: PropTypes.any.isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default BasicOption;
