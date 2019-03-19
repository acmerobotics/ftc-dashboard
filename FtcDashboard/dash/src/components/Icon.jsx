import React from 'react';
import PropTypes from 'prop-types';

const Icon = ({ icon, size, opacity, onClick }) => (
  <div style={{ opacity: opacity || 1.0 }} className={`icon ${icon} ${size}`} onClick={onClick} />
);

Icon.propTypes = {
  icon: PropTypes.string.isRequired,
  size: PropTypes.string.isRequired,
  opacity: PropTypes.number,
  onClick: PropTypes.func
};

export default Icon;
