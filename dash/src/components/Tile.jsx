import React from 'react';
import PropTypes from 'prop-types';

const Tile = ({ children, hidden, row, col }) => (
  <div
    className="tile"
    style={{
      overflow: hidden ? 'hidden' : 'auto',
      gridRow: row,
      gridColumn: col,
    }}>
    { children }
  </div>
);

Tile.propTypes = {
  children: PropTypes.node.isRequired,
  hidden: PropTypes.bool,
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
