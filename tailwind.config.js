/** @type {import('tailwindcss').Config} */
export default {
  content: [
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
        // Legacy migrated pages still use the old Ducks palette names.
        // Keep those classes compiling, but force them into the pop-punk system.
        ducks: {
          green: '#ff1f6b',
          yellow: '#e8d9b8',
        },
        oxblood: {
          DEFAULT: '#ff1f6b', // legacy alias → pink so any stragglers stay loud
        },
      },
      boxShadow: {
        'glow-green': '0 0 0 1px rgba(255,31,107,0.35), 8px 8px 0 rgba(245,245,240,0.18)',
        glow: '0 0 0 1px rgba(255,31,107,0.35), 8px 8px 0 rgba(245,245,240,0.18)',
        'glow-active': '0 0 0 2px rgba(255,31,107,0.65), 10px 10px 0 rgba(245,245,240,0.25)',
        hard: '6px 6px 0 rgba(245,245,240,0.22)',
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
