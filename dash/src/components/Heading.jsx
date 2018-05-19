import React from 'react';
import PropTypes from 'prop-types';

const Heading = ({ children, text, level }) => (
  <div className="heading">
    {React.createElement(`h${level}`, null, text)}
    {children}
  </div>
);

Heading.propTypes = {
  children: PropTypes.node,
  text: PropTypes.string.isRequired,
  level: PropTypes.number.isRequired
};

export default Heading;
