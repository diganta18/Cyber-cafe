/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg:      '#0E0F11',
        sidebar: '#131417',
        surface: { DEFAULT: '#1A1C20', raised: '#22252A' },
        line:    '#2A2D33',
        ink:     { DEFAULT: '#E8E6E1', muted: '#9A9CA3', faint: '#6B6E76' },
        accent:  '#5BB5A2',
        success: '#4CAF7D',
        warning: '#D9A441',
        danger:  '#D9625E',
      },
      boxShadow: {
        'card':       '0 1px 2px rgba(0,0,0,0.4)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
}
