/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', '"SF Mono"', '"Fira Code"', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        bb: {
          bg: '#0a0e17',
          surface: '#0f1420',
          border: '#1a2030',
          'border-hi': '#2a3548',
          amber: '#ff9800',
          'amber-dim': '#b36b00',
          green: '#00c853',
          red: '#ff1744',
          muted: '#5a6a80',
          'muted-dim': '#3a4a5c',
        },
      },
      fontSize: {
        'xxs': ['0.65rem', { lineHeight: '0.85rem' }],
      },
    },
  },
  plugins: [],
}
