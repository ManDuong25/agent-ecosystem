/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/client/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: { 0: '#0f0f14', 1: '#16161d', 2: '#1e1e28', 3: '#2a2a38', 4: '#36364a' },
        accent: { DEFAULT: '#6366f1', hover: '#818cf8' },
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
    },
  },
  plugins: [],
};
