/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: '#F5F4EE', // Warm alabaster/stone page background (main body & top header)
        sidebar: {
          DEFAULT: '#000000', // Twitter/X pure black
          surface: '#16181C', // Dark charcoal for the bottom Admin profile card & hover states
          border: '#262930',  // Subtle dark divider line inside the sidebar
          ink: '#FFFFFF',     // Pure white for all sidebar icons and nav text
          muted: '#8B919E',   // Muted gray for "NAVIGATION" label and "Admin" subtext
        },
        surface: {
          DEFAULT: '#FFFFFF', // Pure white for cards, tables, and modals
          raised: '#F9F8F5',  // Warm off-white for inner cards (like GAME-01, PC-01 slots), hover rows, inputs
        },
        line: '#E4E2DC',      // Warm stone border for all light-mode cards, slots, and dividers
        ink: {
          DEFAULT: '#18181B', // Deep charcoal for primary dashboard headings, numbers, and bold text
          muted: '#6E6D68',   // Warm gray for secondary labels ("ACTIVE SESSIONS", "Gaming", timestamps)
          faint: '#9E9D96',   // Placeholders and captions
        },
        accent: {
          DEFAULT: '#3B7A57', // Deep organic forest/sage green (replaces all cyan/teal)
          soft: 'rgba(59, 122, 87, 0.12)', // Soft tint for icon badges and active states
        },
        success: '#2E8555',   // Crisp botanical green (Paid bills, Available status dots)
        warning: '#D99B26',   // Warm ochre/amber (Today's Revenue accent, pending states)
        danger: '#C94A4A',    // Terracotta red (Occupied dots, Today's Sessions accent, errors)
      },
      boxShadow: {
        'card':       '0 2px 8px -2px rgba(24, 24, 27, 0.06), 0 1px 3px -1px rgba(24, 24, 27, 0.04)',
        'card-hover': '0 4px 16px -2px rgba(24, 24, 27, 0.08), 0 2px 6px -1px rgba(24, 24, 27, 0.06)',
      },
    },
  },
  plugins: [],
}
