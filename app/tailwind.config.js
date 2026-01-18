/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
      colors: {
        // Premium Luxury Palette - Black, White, Gold
        background: '#000000',
        foreground: '#FFFFFF',
        card: '#080808',
        'card-hover': '#0F0F0F',
        border: '#1A1A1A',
        'border-subtle': '#141414',
        muted: '#666666',
        'muted-light': '#888888',
        // Classic Gold - refined, not orange
        accent: '#D4AF37',
        'accent-hover': '#E8C547',
        'accent-muted': 'rgba(212, 175, 55, 0.15)',
        'accent-dim': 'rgba(212, 175, 55, 0.08)',
      },
      borderRadius: {
        none: '0',
        sm: '0',
        DEFAULT: '0',
        md: '0',
        lg: '0',
        xl: '0',
        '2xl': '0',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.5)',
        'card-hover': '0 4px 16px rgba(0, 0, 0, 0.6)',
        'gold': '0 0 20px rgba(212, 175, 55, 0.15)',
        'gold-sm': '0 0 10px rgba(212, 175, 55, 0.1)',
      },
      animation: {
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        skeleton: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '0.6' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      letterSpacing: {
        'tighter': '-0.02em',
        'tight': '-0.01em',
        'wide': '0.1em',
        'wider': '0.15em',
        'widest': '0.2em',
      },
    },
  },
  plugins: [],
};
