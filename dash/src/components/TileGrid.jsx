import React from 'react';
import PropTypes from 'prop-types';

const TileGrid = ({ children }) => (
  <div className="tile-grid">{children}</div>
);

TileGrid.propTypes = {
  children: PropTypes.node.isRequired
};

export default TileGrid;
