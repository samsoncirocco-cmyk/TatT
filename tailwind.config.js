/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // TatT — Tattoo Flash Zine palette
        bone: {
          DEFAULT: '#f1ead8',
          dark: '#e3d9c0',
          deep: '#d4c8a8',
        },
        ink: {
          DEFAULT: '#14110f',
          soft: '#2a2622',
        },
        oxblood: {
          DEFAULT: '#6e1a1a',
          deep: '#4a0d0d',
        },
        riso: {
          cyan: '#2ec4d6',
          orange: '#ef6a30',
        },
      },
      fontFamily: {
        display: ['"Abril Fatface"', 'Georgia', 'serif'],
        body: ['"IM Fell DW Pica"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        none: '0',
        DEFAULT: '0',
        sm: '0',
        md: '0',
        lg: '0',
        xl: '0',
        full: '9999px',
      },
      boxShadow: {
        ink: '4px 4px 0 #14110f',
        'ink-sm': '2px 2px 0 #14110f',
        'ink-lg': '8px 8px 0 #14110f',
        oxblood: '4px 4px 0 #6e1a1a',
      },
      animation: {
        'ink-bleed': 'ink-bleed 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
