/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        nexus: {
          emerald: '#10b981',
          blue: '#3b82f6',
          dark: '#020617'
        }
      }
    }
  },
  plugins: []
};
