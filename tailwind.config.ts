import type { Config } from 'tailwindcss';

/**
 * Colors are driven by CSS variables (RGB triplets) defined in globals.css.
 * This lets the entire palette flip for dark mode without touching components:
 * neutrals (cream = surfaces, ink = text) invert, accents (rose, sage, mauve)
 * are re-tuned per theme.
 */
const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: v('--cream-50'),
          100: v('--cream-100'),
          200: v('--cream-200'),
        },
        rose: {
          50: v('--rose-50'),
          100: v('--rose-100'),
          200: v('--rose-200'),
          300: v('--rose-300'),
          400: v('--rose-400'),
          500: v('--rose-500'),
          600: v('--rose-600'),
          700: v('--rose-700'),
          800: v('--rose-800'),
          900: v('--rose-900'),
        },
        sage: {
          50: v('--sage-50'),
          100: v('--sage-100'),
          200: v('--sage-200'),
          300: v('--sage-300'),
          400: v('--sage-400'),
          500: v('--sage-500'),
        },
        mauve: {
          50: v('--mauve-50'),
          100: v('--mauve-100'),
          200: v('--mauve-200'),
          300: v('--mauve-300'),
          400: v('--mauve-400'),
          500: v('--mauve-500'),
        },
        ink: {
          900: v('--ink-900'),
          800: v('--ink-800'),
          700: v('--ink-700'),
          600: v('--ink-600'),
          500: v('--ink-500'),
          400: v('--ink-400'),
        },
      },
      fontFamily: {
        serif: ['var(--font-display)', 'serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out both',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
        breathe: 'breathe 6s ease-in-out infinite',
        float: 'float 14s ease-in-out infinite',
        'float-slow': 'float 22s ease-in-out infinite',
        shimmer: 'shimmer 2.4s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.9' },
          '50%': { transform: 'scale(1.04)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(3%, -4%) scale(1.06)' },
          '66%': { transform: 'translate(-3%, 3%) scale(0.97)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
