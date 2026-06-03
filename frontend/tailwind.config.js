/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        echo: {
          bg: '#0b1220',
          panel: '#111a2e',
          accent: '#5eead4',
          accent2: '#a78bfa',
          text: '#e2e8f0',
          muted: '#94a3b8',
        },
      },
      animation: {
        'bubble-in': 'bubbleIn 240ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      keyframes: {
        bubbleIn: {
          '0%':   { transform: 'translate(-50%, -50%) scale(0.6)', opacity: '0' },
          '100%': { transform: 'translate(-50%, -50%) scale(1)',   opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
