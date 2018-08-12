import React from 'react';
import PropTypes from 'prop-types';

const BooleanInput = ({ value, onChange }) => (
  <input type="checkbox" checked={value} onChange={evt => onChange(evt.target.checked, true)} />
);

BooleanInput.propTypes = {
  value: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired
};

export default BooleanInput;
