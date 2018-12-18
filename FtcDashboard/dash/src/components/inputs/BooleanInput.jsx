import React from 'react';
import PropTypes from 'prop-types';

const BooleanInput = ({ value, onChange, onSave }) => (
  <span>
    <input type="checkbox" checked={value} onChange={evt => onChange({
      value: evt.target.checked, 
      valid: true
    })} />
    <button onClick={onSave}>Save</button>
  </span>
);

BooleanInput.propTypes = {
  value: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired
};

export default BooleanInput;
