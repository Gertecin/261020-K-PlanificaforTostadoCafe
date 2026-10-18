/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cafe: {
          DEFAULT: '#5A3A28',
          dark: '#2A1B12',
          light: '#8B5E3C'
        },
        cafetal: '#2F4A3A',
        alerta: '#92400E',
        fondo: '#FAF9F6'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
