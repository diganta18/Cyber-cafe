/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          600: '#2563EB',
          700: '#1D4ED8',
        },
        status: {
          available:   '#16A34A',
          occupied:    '#DC2626',
          maintenance: '#6B7280',
          unpaid:      '#D97706',
          paid:        '#16A34A',
          void:        '#9CA3AF',
          active:      '#2563EB',
        },
      },
    },
  },
  plugins: [],
}
