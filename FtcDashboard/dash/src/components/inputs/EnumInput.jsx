import React from 'react';
import PropTypes from 'prop-types';

const EnumInput = ({ value, enumValues, onChange, onSave }) => (
  <span>
    <select
      className="valid mr-4 rounded py-0"
      value={value}
      onChange={(evt) =>
        onChange({
          value: evt.target.value,
          valid: true,
        })
      }
    >
      {enumValues.map((enumValue) => (
        <option key={enumValue} value={enumValue}>
          {enumValue}
        </option>
      ))}
    </select>
    <button
      className="bg-gray-100 px-2 rounded border border-gray-200"
      onClick={onSave}
    >
      Save
    </button>
  </span>
);

EnumInput.propTypes = {
  value: PropTypes.string.isRequired,
  enumValues: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default EnumInput;
