import React from 'react';
import PropTypes from 'prop-types';
import BooleanInput from '../components/inputs/BooleanInput';
import EnumInput from '../components/inputs/EnumInput';
import TextInput from '../components/inputs/TextInput';
import OptionType from '../enums/OptionType';
import { validateDouble, validateInt, validateString } from '../components/inputs/validate';

class BasicOption extends React.Component {
  render() {
    const { name, value, modified, valid, schema, onChange, onSave } = this.props;

    const type = OptionType.getFromSchema(schema);

    const optionOnSave = () => {
      if (valid && modified) {
        onSave(value);
      }
    };

    let input;

    switch (type) {
    case OptionType.INT:
      input = <TextInput value={value} valid={valid} validate={validateInt} onChange={onChange} onSave={optionOnSave} />;
      break;
    case OptionType.DOUBLE:
      input = <TextInput value={value} valid={valid} validate={validateDouble} onChange={onChange} onSave={optionOnSave} />;
      break;
    case OptionType.STRING:
      input = <TextInput value={value} valid={valid} validate={validateString} onChange={onChange} onSave={optionOnSave} />;
      break;
    case OptionType.BOOLEAN:
      input = <BooleanInput value={value} onChange={onChange} onSave={optionOnSave} />;
      break;
    case OptionType.ENUM:
      input = <EnumInput value={value} values={schema.values} onChange={onChange} onSave={optionOnSave} />;
      break;
    default:
      input = <p>Unknown option type: {type}</p>;
    }

    return (
      <tr>
        <td><span style={ modified ? {
          userSelect: 'auto',
          opacity: 1.0
        } : {
          userSelect: 'none',
          opacity: 0.0
        }}>*</span>{name}</td>
        <td>{input}</td>
      </tr>
    );
  }
}

BasicOption.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.any.isRequired,
  modified: PropTypes.bool.isRequired,
  valid: PropTypes.bool.isRequired,
  schema: PropTypes.any.isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default BasicOption;
