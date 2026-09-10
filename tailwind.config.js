/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        crafted: {
          bg: '#1B1515',
          surface: '#241D1D',
          'surface-hover': '#2E2525',
          panel: '#1F1818',
          border: '#352929',
          'border-bright': '#483838',
          text: '#F3EFEF',
          'text-muted': '#A19898',
          'text-dim': '#756C6C',
          brand: {
            rust: '#A9452D',
            rustLight: '#D45B3E',
            violet: '#4641A1',
            lightViolet: '#6B64F6',
          },
        },
      },
      backgroundImage: {
        'crafted-brand': 'linear-gradient(135deg, #4641A1 0%, #A9452D 50%, #6B64F6 100%)',
        'crafted-button': 'linear-gradient(90deg, #6B64F6 0%, #A9452D 50%, #D45B3E 100%)',
        'crafted-rust-gradient': 'linear-gradient(135deg, #A9452D 0%, #D45B3E 100%)',
        'crafted-glow-violet': 'radial-gradient(circle at 10% 20%, rgba(70, 65, 161, 0.2) 0%, transparent 60%)',
        'crafted-glow-rust': 'radial-gradient(circle at 90% 80%, rgba(169, 69, 45, 0.18) 0%, transparent 60%)',
        'vignette-hero': 'linear-gradient(180deg, rgba(27, 21, 21, 0.1) 0%, rgba(27, 21, 21, 0.75) 60%, #1B1515 100%), linear-gradient(90deg, #1B1515 0%, rgba(27, 21, 21, 0.9) 35%, rgba(27, 21, 21, 0.4) 65%, rgba(27, 21, 21, 0.1) 100%)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'Geist',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'Segoe UI Mono', 'Menlo', 'Consolas', 'sans-serif'],
      },
      borderRadius: {
        sm: '10px',
        md: '14px',
        lg: '18px',
        xl: '26px',
        '2xl': '24px',
        '3xl': '32px',
      },
      boxShadow: {
        'crafted-card': '0 8px 32px rgba(0, 0, 0, 0.4)',
        'crafted-glow': '0 0 25px rgba(169, 69, 45, 0.25)',
        'crafted-glow-violet': '0 0 25px rgba(107, 100, 246, 0.25)',
        'crafted-hero': '0 20px 50px rgba(0, 0, 0, 0.85)',
      },
    },
  },
  plugins: [],
};
