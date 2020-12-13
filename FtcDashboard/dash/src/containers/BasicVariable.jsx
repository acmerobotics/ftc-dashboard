import React from 'react';
import PropTypes from 'prop-types';

import BooleanInput from '../components/inputs/BooleanInput';
import EnumInput from '../components/inputs/EnumInput';
import TextInput from '../components/inputs/TextInput';
import VariableType from '../enums/VariableType';
import {
  validateDouble,
  validateInt,
  validateString,
} from '../components/inputs/validation';

class BasicVariable extends React.Component {
  render() {
    const {
      type,
      name,
      value,
      enumClass,
      enumValues,
      modified,
      valid,
      onChange,
      onSave,
    } = this.props;

    const optionOnChange = ({ valid, value }) => {
      onChange({
        __type: type,
        __value: value,
        __valid: valid,
      });
    };

    const optionOnSave = () => {
      if (valid && modified) {
        onSave({
          __type: type,
          __value: value,
          __valid: true,
          __enumClass: enumClass,
        });
      }
    };

    let input;

    switch (type) {
      case VariableType.INT:
        input = (
          <TextInput
            value={value}
            valid={valid}
            validate={validateInt}
            onChange={optionOnChange}
            onSave={optionOnSave}
          />
        );
        break;
      case VariableType.DOUBLE:
        input = (
          <TextInput
            value={value}
            valid={valid}
            validate={validateDouble}
            onChange={optionOnChange}
            onSave={optionOnSave}
          />
        );
        break;
      case VariableType.STRING:
        input = (
          <TextInput
            value={value}
            valid={valid}
            validate={validateString}
            onChange={optionOnChange}
            onSave={optionOnSave}
          />
        );
        break;
      case VariableType.BOOLEAN:
        input = (
          <BooleanInput
            value={value}
            onChange={optionOnChange}
            onSave={optionOnSave}
          />
        );
        break;
      case VariableType.ENUM:
        input = (
          <EnumInput
            value={value}
            enumValues={enumValues}
            onChange={optionOnChange}
            onSave={optionOnSave}
          />
        );
        break;
      default:
        input = <p>Unknown option type: {type}</p>;
    }

    return (
      <tr>
        <td>
          <span
            style={
              modified
                ? {
                    userSelect: 'auto',
                    opacity: 1.0,
                  }
                : {
                    userSelect: 'none',
                    opacity: 0.0,
                  }
            }
          >
            *
          </span>
          {name}
        </td>
        <td>{input}</td>
      </tr>
    );
  }
}

BasicVariable.propTypes = {
  type: PropTypes.oneOf(Object.values(VariableType)).isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.any.isRequired,
  modified: PropTypes.bool.isRequired,
  valid: PropTypes.bool.isRequired,
  enumClass: PropTypes.string,
  enumValues: PropTypes.arrayOf(PropTypes.string),
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default BasicVariable;
