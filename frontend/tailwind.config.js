/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--p-primary-color)',
        surface: 'var(--p-surface-0)',
      },
    },
  },
  plugins: [],
}
