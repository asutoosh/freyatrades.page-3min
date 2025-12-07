import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'preview-dark': '#0a0a0b',
        'preview-card': '#141418',
        'preview-border': '#1f1f24',
        'preview-yellow': '#fcd535',
        'preview-gold': '#f0b90b',
        'telegram-blue': '#229ed9',
      },
      fontFamily: {
        sans: ['var(--font-geist)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(252, 213, 53, 0.3)' },
          '100%': { boxShadow: '0 0 40px rgba(252, 213, 53, 0.6)' },
        },
      },
    },
  },
  plugins: [],
}
export default config

