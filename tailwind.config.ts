import type { Config } from "tailwindcss";

export default {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/services/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/hooks/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Oregon Ducks brand palette
                'ducks-green': '#154733',
                'ducks-yellow': '#FEE123',
                'ducks-green-light': '#1a5c43',
                'ducks-green-dark': '#0a1f14',

                // Studio design tokens
                'studio-bg': 'var(--studio-bg)',
                'studio-accent': 'var(--studio-accent)',
                'studio-neon': 'var(--studio-neon)',

                // Gold scale
                gold: {
                    50: '#FFFDF0',
                    100: '#FFF9D6',
                    200: '#FFF3AD',
                    300: '#FFED85',
                    400: '#FEE123',
                    500: '#D4BC0A',
                    600: '#AA9708',
                    700: '#806F06',
                    800: '#554B04',
                    900: '#2B2502',
                },

                // Semantic
                primary: {
                    50: '#eff6ff',
                    100: '#dbeafe',
                    200: '#bfdbfe',
                    300: '#93c5fd',
                    400: '#60a5fa',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                    800: '#1e40af',
                    900: '#1e3a8a',
                    950: '#172554',
                },
                secondary: {
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                    950: '#020617',
                },
                zinc: {
                    900: '#18181b',
                    950: '#09090b',
                },
                background: '#050505',
                surface: '#121212',
            },
            fontFamily: {
                sans: ['Space Grotesk', 'Outfit', 'sans-serif'],
                display: ['Space Grotesk', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            backgroundImage: {
                'mesh-gradient': 'radial-gradient(circle at 50% 0%, rgba(21, 71, 51, 0.4), transparent 70%)',
                'glass-panel': 'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                'gold-gradient': 'linear-gradient(135deg, #FEE123, #154733)',
            },
            dropShadow: {
                'glow': '0 0 10px rgba(254, 225, 35, 0.3)',
                'glow-green': '0 0 15px rgba(21, 71, 51, 0.5)',
                'glow-lg': '0 0 30px rgba(254, 225, 35, 0.2)',
            },
            spacing: {
                '18': '4.5rem',
                '88': '22rem',
                '128': '32rem',
            },
            borderRadius: {
                'xl': '1rem',
                '2xl': '1.5rem',
                '3xl': '2rem',
            },
            boxShadow: {
                'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
                'medium': '0 4px 16px rgba(0, 0, 0, 0.12)',
                'hard': '0 8px 24px rgba(0, 0, 0, 0.16)',
                'gold': '0 4px 30px rgba(254, 225, 35, 0.15)',
                'gold-lg': '0 8px 50px rgba(254, 225, 35, 0.2)',
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-in-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'slide-down': 'slideDown 0.3s ease-out',
                'scale-in': 'scaleIn 0.2s ease-out',
                'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
                'float': 'float 6s ease-in-out infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideDown: {
                    '0%': { transform: 'translateY(-10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                scaleIn: {
                    '0%': { transform: 'scale(0.95)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                pulseGlow: {
                    '0%, 100%': { opacity: '1', filter: 'brightness(1)' },
                    '50%': { opacity: '0.7', filter: 'brightness(1.3)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
            },
        },
    },
    plugins: [],
} satisfies Config;
