// eslint-disable-next-line @typescript-eslint/no-var-requires
const colors = require('tailwindcss/colors');

module.exports = {
  purge: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      colors: {
        red: colors.rose,
        yellow: colors.amber,
        gray: colors.blueGray,
      },
      borderWidth: {
        6: '6px',
      },
      fontFamily: {
        sans: ['Roboto'],
      }
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
