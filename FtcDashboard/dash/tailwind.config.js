/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './index.html'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto'],
      },
      cursor: {
        'col-resize': 'col-resize',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
