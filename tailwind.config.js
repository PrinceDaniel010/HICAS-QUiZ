/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#161B33',
          50: '#EEF0F8',
          100: '#D6DAEE',
          400: '#4A5285',
          600: '#262D52',
          900: '#0D1024',
        },
        parchment: '#FBF7EE',
        gold: {
          DEFAULT: '#F2B705',
          soft: '#FBE7A6',
        },
        coral: '#EF476F',
        mint: '#2EC4B6',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 12px 30px -12px rgba(22, 27, 51, 0.35)',
      },
    },
  },
  plugins: [],
};
