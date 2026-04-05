/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          50:  '#F1F8E9', 100: '#DCEDC8', 200: '#C5E1A5',
          300: '#AED581', 400: '#9CCC65', 500: '#8BC34A',
          600: '#7CB342', 700: '#558B2F', 800: '#2E7D32',
          900: '#1B5E20',
        },
        clay:  { 50: '#FFF8F1', 500: '#E8824A', 700: '#C0603A' },
        cream: '#FAFAF7',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 2px 16px rgba(27,94,32,0.08)',
        lift: '0 8px 32px rgba(27,94,32,0.14)',
      },
      borderRadius: { xl2: '1.25rem', xl3: '1.75rem' },
    },
  },
  plugins: [],
};
