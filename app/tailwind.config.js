/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#020617',  // slate-950
        foreground: '#f8fafc',  // slate-50
        card: '#0f172a',        // slate-900
        border: '#1e293b',      // slate-800
        muted: '#64748b',       // slate-500
        accent: '#3b82f6',      // blue-500
      },
    },
  },
  plugins: [],
};
