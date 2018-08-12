import React from 'react';
import PropTypes from 'prop-types';

const IconGroup = ({ children }) => (
  <div className="icon-group">
    { children }
  </div>
);

IconGroup.propTypes = {
  children: PropTypes.node.isRequired
};

export default IconGroup;
