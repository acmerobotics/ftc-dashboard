import React from 'react';
import PropTypes from 'prop-types';

const Icon = ({ icon, size, onClick }) => (
  <div className={`icon ${icon} ${size}`} onClick={onClick} />
);

Icon.propTypes = {
  icon: PropTypes.string.isRequired,
  size: PropTypes.string.isRequired,
  onClick: PropTypes.func
};

export default Icon;
