/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Colors are now defined in app.css using @theme
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
