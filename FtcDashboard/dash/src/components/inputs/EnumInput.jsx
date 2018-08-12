import React from 'react';
import PropTypes from 'prop-types';

const EnumInput = ({ value, values, onChange }) => (
  <select
    className="valid"
    value={value}
    onChange={evt => onChange(evt.target.value, true)}>
    {
      values.map(v => (<option key={v} value={v}>{v}</option>))
    }
  </select>
);

EnumInput.propTypes = {
  value: PropTypes.string.isRequired,
  values: PropTypes.arrayOf(PropTypes.string).isRequired,
  onChange: PropTypes.func.isRequired
};

export default EnumInput;
