import clsx from 'clsx';

import { RGB, rgbToHex } from './colorUtils';

type ColorSwatchProps = {
  color: RGB;
  className?: string;
};

/** A solid block of the given color, hex in its tooltip. */
const ColorSwatch = ({ color, className }: ColorSwatchProps) => (
  <div
    className={clsx(
      'overflow-hidden rounded border border-gray-300 dark:border-slate-600',
      className,
    )}
    style={{ background: rgbToHex(color) }}
    title={rgbToHex(color)}
  />
);

export default ColorSwatch;
