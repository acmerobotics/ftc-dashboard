import React from 'react';
import PropTypes from 'prop-types';

const EnumInput = ({ value, values, onChange, onSave }) => (
  <span>
    <select
      className="valid"
      value={value}
      onChange={evt => onChange({
        value: evt.target.value, 
        valid: true
      })}>
      {
        values.map(v => (<option key={v} value={v}>{v}</option>))
      }
    </select>
    <button onClick={onSave}>Save</button>
  </span>
);

EnumInput.propTypes = {
  value: PropTypes.string.isRequired,
  values: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired
};

export default EnumInput;
