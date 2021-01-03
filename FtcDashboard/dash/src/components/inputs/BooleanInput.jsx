import React from 'react';
import PropTypes from 'prop-types';

const BooleanInput = ({ value, onChange, onSave }) => (
  <span className="flex items-center">
    <input
      className="mr-4 rounded"
      type="checkbox"
      checked={value}
      onChange={(evt) =>
        onChange({
          value: evt.target.checked,
          valid: true,
        })
      }
    />
    <button
      className="bg-gray-100 px-2 rounded border border-gray-200"
      onClick={onSave}
    >
      Save
    </button>
  </span>
);

BooleanInput.propTypes = {
  value: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default BooleanInput;
