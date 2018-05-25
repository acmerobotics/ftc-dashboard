import React from 'react';
import PropTypes from 'prop-types';

const Tile = ({ children, row, col }) => (
  <div
    className="tile"
    style={{
      gridRow: row,
      gridColumn: col,
    }}>
    { children }
  </div>
);

Tile.propTypes = {
  children: PropTypes.node.isRequired,
  row: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string
  ]).isRequired,
  col: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string
  ]).isRequired
};

export default Tile;
