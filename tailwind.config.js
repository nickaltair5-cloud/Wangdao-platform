/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        midnight: {
          50: '#eef2fb',
          100: '#d6def3',
          200: '#aebdea',
          300: '#7d8cd9',
          400: '#5466c4',
          500: '#394aa8',
          600: '#2833847',
          700: '#121833',
          800: '#0c1024',
          900: '#070a18',
          950: '#040611',
        },
        cyan: {
          DEFAULT: '#22d3ee',
          deep: '#0891b2',
          glow: '#67e8f9',
        },
        gold: {
          DEFAULT: '#d4af37',
          light: '#e6c75a',
          dark: '#a8841f',
          glow: '#f2d680',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'midnight-radial':
          'radial-gradient(ellipse at top, rgba(34,211,238,0.06), transparent 55%), radial-gradient(ellipse at bottom, rgba(212,175,55,0.04), transparent 60%), linear-gradient(180deg, #040611 0%, #070a18 50%, #040611 100%)',
        'gold-gradient': 'linear-gradient(135deg, #f2d680 0%, #d4af37 50%, #a8841f 100%)',
        'cyan-gradient': 'linear-gradient(135deg, #67e8f9 0%, #22d3ee 50%, #0891b2 100%)',
      },
      boxShadow: {
        cyan: '0 0 24px -4px rgba(34,211,238,0.45)',
        gold: '0 0 24px -4px rgba(212,175,55,0.45)',
        'inset-cyan': 'inset 0 1px 0 0 rgba(103,232,249,0.15)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212,175,55,0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(212,175,55,0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'scale-in': 'scale-in 0.25s ease-out',
        shimmer: 'shimmer 2.5s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
