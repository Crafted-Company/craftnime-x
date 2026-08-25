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
          surface: '#241E1E',
          'surface-hover': '#2C2525',
          panel: '#201A1A',
          border: '#312929',
          'border-bright': '#453B3B',
          text: '#F3EFEF',
          'text-muted': '#A19898',
          'text-dim': '#6E6666',
          brand: {
            blue: '#433FA9',
            rust: '#A9452D',
            rustLight: '#D45B3E',
            violet: '#4641A9',
            lightViolet: '#6864F6',
          },
        },
      },
      backgroundImage: {
        'crafted-brand': 'linear-gradient(135deg, #433FA9 0%, #A9452D 50%, #4641A9 100%)',
        'crafted-button': 'linear-gradient(90deg, #6864F6 0%, #A9452D 50%, #6E6AF6 100%)',
        'crafted-rust-gradient': 'linear-gradient(135deg, #A9452D 0%, #D45B3E 100%)',
        'crafted-glow-blue': 'radial-gradient(circle at 10% 20%, rgba(67, 63, 169, 0.15) 0%, transparent 60%)',
        'crafted-glow-rust': 'radial-gradient(circle at 90% 80%, rgba(169, 69, 45, 0.12) 0%, transparent 60%)',
        'vignette-hero': 'linear-gradient(180deg, rgba(27, 21, 21, 0.1) 0%, rgba(27, 21, 21, 0.6) 60%, #1B1515 100%), linear-gradient(90deg, #1B1515 0%, rgba(27, 21, 21, 0.85) 35%, rgba(27, 21, 21, 0.4) 65%, rgba(27, 21, 21, 0.1) 100%)',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      boxShadow: {
        'crafted-card': '0 4px 20px rgba(0, 0, 0, 0.35)',
        'crafted-glow': '0 0 25px rgba(169, 69, 45, 0.25)',
        'crafted-glow-violet': '0 0 25px rgba(104, 100, 246, 0.25)',
        'crafted-hero': '0 20px 50px rgba(0, 0, 0, 0.8)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
