/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // TICKETS TO MY DOWNFALL — hot pink, pitch black, bleached white, sparing cream.
        pink: {
          DEFAULT: '#ff1f6b',
          deep: '#d6004f',
        },
        ink: {            // kept as alias for legacy classes, mapped to black
          DEFAULT: '#0a0a0a',
          soft: '#9a9690',
        },
        bone: {           // legacy alias, mapped to bleached white
          DEFAULT: '#f5f5f0',
          dark: '#e8d9b8',
        },
        cream: {
          DEFAULT: '#e8d9b8',
        },
        oxblood: {
          DEFAULT: '#ff1f6b', // legacy alias → pink so any stragglers stay loud
        },
      },
      fontFamily: {
        display: ['"Anton"', 'Impact', 'Arial Narrow', 'sans-serif'],
        body:    ['"Space Mono"', 'Menlo', 'monospace'],
      },
      borderRadius: {
        none: '0',
        DEFAULT: '0',
        sm: '0',
        md: '0',
        lg: '0',
        full: '9999px',
      },
    },
  },
  plugins: [],
}
