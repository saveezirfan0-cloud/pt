import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDF8F4',
          100: '#FAF0E6',
          200: '#F5E3D1',
        },
        rose: {
          50: '#FDF2F0',
          100: '#FBE3DE',
          200: '#F5C2B8',
          300: '#EB9988',
          400: '#DC6F58',
          500: '#C84A30',
          600: '#A93820',
          700: '#822A18',
          800: '#5A1D11',
          900: '#3B130B',
        },
        sage: {
          50: '#F2F5F0',
          100: '#E1E9DC',
          200: '#C4D2B9',
          300: '#9CB18B',
          400: '#7A9266',
          500: '#5E7A4D',
        },
        ink: {
          900: '#1A1410',
          800: '#2D2520',
          700: '#4A3F38',
          600: '#6B5D54',
          500: '#8A7A6E',
          400: '#A89889',
        },
      },
      fontFamily: {
        serif: ['var(--font-display)', 'serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-soft': 'pulseSoft 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
