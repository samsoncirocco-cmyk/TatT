/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // TatT — paper, ink, one accent.
        bone: {
          DEFAULT: '#f3ecd9',
          dark: '#e8e0c8',
        },
        ink: {
          DEFAULT: '#15110d',
          soft: '#5a5249',
        },
        oxblood: {
          DEFAULT: '#6b1818',
        },
      },
      fontFamily: {
        // One family. Multiple weights, optical sizes, and a soft axis.
        display: ['"Fraunces"', 'Georgia', 'serif'],
        body:    ['"Fraunces"', 'Georgia', 'serif'],
      },
      borderRadius: {
        none: '0',
        DEFAULT: '2px',
        sm: '2px',
        md: '3px',
        lg: '4px',
        full: '9999px',
      },
    },
  },
  plugins: [],
}
