/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sand: {
          50:  '#FAFAF8',
          100: '#F5F2ED',
          200: '#EDE7DF',
          300: '#DDD5CB',
          400: '#C8BDB4',
          500: '#A89A8E',
          600: '#8A7B6F',
          700: '#6B5E54',
          800: '#4A3F38',
          900: '#2C231D',
        },
        bronze: {
          50:  '#FBF6F0',
          100: '#F4E8D5',
          200: '#E5CAAA',
          300: '#D4A87A',
          400: '#C28C56',
          500: '#B8936A',
          600: '#8B6A47',
          700: '#6B4F33',
          800: '#4A3524',
          900: '#2C1F15',
        },
        atelier: {
          dark:   '#1A1714',
          deeper: '#141210',
          warm:   '#2C2724',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans:    ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'warm-xs': '0 1px 2px rgba(28,23,18,0.05)',
        'warm-sm': '0 1px 4px rgba(28,23,18,0.07), 0 1px 2px rgba(28,23,18,0.04)',
        'warm':    '0 4px 16px rgba(28,23,18,0.08), 0 2px 4px rgba(28,23,18,0.04)',
        'warm-lg': '0 12px 40px rgba(28,23,18,0.10), 0 4px 8px rgba(28,23,18,0.05)',
        'warm-xl': '0 24px 64px rgba(28,23,18,0.14), 0 8px 16px rgba(28,23,18,0.07)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
