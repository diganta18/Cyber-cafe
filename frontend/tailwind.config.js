/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:      ['Inter', 'system-ui', 'sans-serif'],
        geist:     ['Geist', 'system-ui', 'sans-serif'],
        mono:      ['Geist Mono', 'ui-monospace', 'monospace'],
        pricedown: ['Pricedown', 'Impact', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Main screen background: Warm vanilla cream from palette (#F5F0D0)
        bg: '#F5F0D0',
        // Dark sidebar: Deep espresso dark from palette (#2A2407)
        sidebar: {
          DEFAULT: '#2A2407',
          surface: '#1D1905', // Darker espresso for bottom profile card & hover
          border: '#3F3714',  // Warm olive-espresso border line
          ink: '#FFFFFF',     // Crisp white for active nav and headings
          muted: '#B0A888',   // Warm olive-gray for navigation labels & subtext
        },
        surface: {
          DEFAULT: '#FFFFFF', // Pure white for cards, tables, and modals
          raised: '#ECE4A9',  // Warm vanilla cream from palette (#ECE4A9) for inner cards & inputs
        },
        line: '#DDD496',      // Warm vanilla-stone divider line
        ink: {
          DEFAULT: '#2A2407', // Deep espresso from palette for primary text & headings
          muted: '#645B38',   // Warm olive-charcoal for secondary labels
          faint: '#948A63',   // Warm muted captions & placeholders
        },
        // Primary Accent: Vibrant Amber Orange from palette (#EC7E00) for all primary buttons & highlights
        accent: {
          DEFAULT: '#EC7E00',
          hover: '#D46F00',
          soft: 'rgba(236, 126, 0, 0.12)',
        },
        // Success: Mapped to Amber Orange to eliminate pine green across status tags & badges
        success: '#EC7E00',
        warning: '#EC7E00',
        // Terracotta red for Occupied stations & danger actions
        danger: '#C94A4A',
      },
      boxShadow: {
        'card':       '4px 4px 0px #2A2407',
        'card-sm':    '2px 2px 0px #2A2407',
        'card-hover': '6px 6px 0px #2A2407',
        'btn':        '2px 2px 0px #2A2407',
        'btn-hover':  '3px 3px 0px #2A2407',
      },
    },
  },
  plugins: [],
}
