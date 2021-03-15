// eslint-disable-next-line @typescript-eslint/no-var-requires
const colors = require('tailwindcss/colors');

function hexToRgb(hex) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function (m, r, g, b) {
    return r + r + g + g + b + b;
  });

  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        red: parseInt(result[1], 16),
        green: parseInt(result[2], 16),
        blue: parseInt(result[3], 16),
      }
    : null;
}

function makeShadow(name, rgb) {
  const obj = {};

  const nameWithDash = name ? `${name}-` : '';
  const defaultName = name ? name : 'DEFAULT';

  obj[`${nameWithDash}xs`] = `0 0 0 1px rgba(${rgb}, 0.05)`;
  obj[`${nameWithDash}xs-prominent`] = `0 0 0 1px rgba(${rgb}, 0.5)`;
  obj[`${nameWithDash}sm`] = `0 1px 2px 0 rgba(${rgb}, 0.05)`;
  obj[`${nameWithDash}sm-prominent`] = `0 1px 2px 0 rgba(${rgb}, 0.5)`;
  obj[
    defaultName
  ] = `0 1px 3px 0 rgba(${rgb}, 0.1), 0 1px 2px 0 rgba(${rgb}, 0.06)`;
  obj[
    `${defaultName}-prominent`
  ] = `0 1px 3px 0 rgba(${rgb}, 0.1), 0 1px 2px 0 rgba(${rgb}, 0.5)`;
  obj[
    `${nameWithDash}md`
  ] = `0 4px 6px -1px rgba(${rgb}, 0.1), 0 2px 4px -1px rgba(${rgb}, 0.06)`;
  obj[
    `${nameWithDash}md-prominent`
  ] = `0 4px 6px -1px rgba(${rgb}, 0.1), 0 2px 4px -1px rgba(${rgb}, 0.5)`;
  obj[
    `${nameWithDash}lg`
  ] = `0 10px 15px -3px rgba(${rgb}, 0.1), 0 4px 6px -2px rgba(${rgb}, 0.05)`;
  obj[
    `${nameWithDash}lg-prominent`
  ] = `0px 14px 24px -10px rgba(${rgb}, 0.22), 0 4px 23px 0px rgba(${rgb}, 0.05), 0 8px 10px -5px rgba(${rgb}, 0.2)`;
  obj[
    `${nameWithDash}xl`
  ] = `0 20px 25px -5px rgba(${rgb}, 0.1), 0 10px 10px -5px rgba(${rgb}, 0.04)`;
  obj[
    `${nameWithDash}xl-prominent`
  ] = `0 20px 25px -5px rgba(${rgb}, 0.1), 0 10px 10px -5px rgba(${rgb}, 0.5)`;
  obj[`${nameWithDash}2xl`] = `0 25px 50px -12px rgba(${rgb}, 0.25)`;
  obj[`${nameWithDash}2xl-prominent`] = `0 25px 50px -12px rgba(${rgb}, 0.5)`;
  obj[`${nameWithDash}inner`] = `inset 0 2px 4px 0 rgba(${rgb}, 0.06)`;
  obj[`${nameWithDash}inner-prominent`] = `inset 0 2px 4px 0 rgba(${rgb}, 0.5)`;
  return obj;
}

function buildShadowPalette(theme) {
  // default tailwindcss black shadows
  const defaultPalette = {
    ...makeShadow('', '0, 0, 0'),
    outline: '0 0 0 3px rgba(66, 153, 225, 0.5)',
    none: 'none',
  };

  const coloredShadowPalette = Object.values(
    Object.entries(theme('colors')).reduce((acc, curr) => {
      const [k, v] = curr;
      if (
        typeof v === 'string' &&
        v !== 'transparent' &&
        v !== 'currentColor'
      ) {
        const { red, green, blue } = hexToRgb(v);
        acc[k] = makeShadow(k, `${red}, ${green}, ${blue}`);
      }
      if (typeof v === 'object') {
        Object.entries(v).forEach(([_k, _v]) => {
          const { red, green, blue } = hexToRgb(_v);
          acc[`${k}-${_k}`] = makeShadow(
            `${k}-${_k}`,
            `${red}, ${green}, ${blue}`,
          );
        });
      }
      return acc;
    }, {}),
  );

  return coloredShadowPalette.reduce(
    (acc, cur) => ({ ...acc, ...cur }),
    defaultPalette,
  );
}

module.exports = {
  purge: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        red: colors.rose,
        yellow: colors.amber,
        gray: colors.blueGray,
        orange: colors.orange,
        'neutral-gray': colors.gray,
      },
      fontFamily: {
        sans: ['Roboto'],
      },
      boxShadow: (theme) => {
        return {
          ...buildShadowPalette(theme),
        };
      },
      cursor: {
        'col-resize': 'col-resize',
      },
    },
  },
  variants: {
    extend: {
      boxShadow: ['disabled'],
      textColor: ['disabled'],
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
