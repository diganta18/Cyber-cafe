# Cyber Café Admin — Design System

## Purpose
A clean, high-contrast admin tool for counter staff working all day. Data-dense, fast to scan, minimal chrome. Professional calm over visual excitement.

---

## Colors

### Primary Palette
| Token | Hex | Usage |
|---|---|---|
| `primary-600` | `#2563EB` | Primary buttons, active nav links, key actions |
| `primary-700` | `#1D4ED8` | Button hover |
| `primary-50` | `#EFF6FF` | Subtle highlights, selected row backgrounds |
| `primary-100` | `#DBEAFE` | Badge backgrounds |

### Status Colors
| Token | Hex | Usage |
|---|---|---|
| `status-available` | `#16A34A` (green-600) | Station available badge |
| `status-occupied` | `#DC2626` (red-600) | Station occupied badge |
| `status-maintenance`| `#6B7280` (gray-500) | Station maintenance badge |
| `status-unpaid` | `#D97706` (amber-600) | Bill unpaid badge |
| `status-paid` | `#16A34A` (green-600) | Bill paid badge |
| `status-void` | `#9CA3AF` (gray-400) | Bill void badge |
| `status-active` | `#2563EB` (blue-600) | Session active badge |

### Neutral Scale (Base)
| Token | Hex | Usage |
|---|---|---|
| `gray-950` | `#030712` | Sidebar background |
| `gray-900` | `#111827` | Top bar |
| `gray-800` | `#1F2937` | Dark card backgrounds |
| `gray-700` | `#374151` | Borders on dark surfaces |
| `gray-600` | `#4B5563` | Disabled text, secondary icons |
| `gray-400` | `#9CA3AF` | Placeholder text |
| `gray-200` | `#E5E7EB` | Table dividers, input borders |
| `gray-100` | `#F3F4F6` | Page background, table row alt |
| `gray-50` | `#F9FAFB` | Card background |
| `white` | `#FFFFFF` | Content surface |

---

## Typography

### Font Pair
- **UI Font:** Inter (Google Fonts) — clean, legible, professional
- **Mono Font:** JetBrains Mono — bill numbers, amounts

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### Scale
| Token | Size | Weight | Usage |
|---|---|---|---|
| `text-xs` | 11px | 500 | Badges, labels |
| `text-sm` | 13px | 400/500 | Table body, secondary text |
| `text-base` | 14px | 400 | Body default |
| `text-lg` | 16px | 600 | Card titles, section headings |
| `text-xl` | 20px | 700 | Page headings, stat values |
| `text-2xl` | 24px | 700 | Large dashboard stats |

---

## Spacing Scale
Standard Tailwind 4px base: `1=4px, 2=8px, 3=12px, 4=16px, 5=20px, 6=24px, 8=32px, 10=40px, 12=48px`

- **Card padding:** `p-4` / `p-6`
- **Table cell padding:** `px-4 py-3`
- **Sidebar width:** `w-56` (224px)
- **Top bar height:** `h-14`

---

## Border Radius
| Context | Class |
|---|---|
| Buttons | `rounded-md` |
| Inputs | `rounded-md` |
| Cards | `rounded-lg` |
| Badges | `rounded-full` |
| Modals | `rounded-xl` |

---

## Shadows
- **Card:** `shadow-sm` (subtle lift)
- **Modal:** `shadow-xl ring-1 ring-black/5`
- **Dropdown:** `shadow-lg`

---

## Component Styles

### Buttons
```
Primary:   bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-2 rounded-md text-sm transition-colors
Secondary: bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium px-4 py-2 rounded-md text-sm
Danger:    bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-md text-sm
Ghost:     hover:bg-gray-100 text-gray-600 px-3 py-2 rounded-md text-sm
```

### Inputs
```
border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400
focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent
```

### Table
```
Header: bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3
Row:    border-b border-gray-100 hover:bg-gray-50 text-sm text-gray-700
```

### Cards
```
bg-white rounded-lg shadow-sm border border-gray-100 p-6
```

### Status Badges
```
available:   bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-0.5 rounded-full
occupied:    bg-red-100 text-red-700 ...
maintenance: bg-gray-100 text-gray-600 ...
unpaid:      bg-amber-100 text-amber-700 ...
paid:        bg-green-100 text-green-700 ...
void:        bg-gray-100 text-gray-400 ...
active:      bg-blue-100 text-blue-700 ...
```

### StatCard
```
bg-white rounded-lg shadow-sm border border-gray-100 p-6
Icon: 40px colored background circle, lucide icon
Value: text-2xl font-bold text-gray-900
Label: text-sm text-gray-500 mt-1
```

---

## Layout
- **Sidebar:** fixed left, `w-56`, dark `bg-gray-950`, white nav links with `hover:bg-gray-800`
- **Top Bar:** `h-14 bg-white border-b border-gray-100`, user name + logout
- **Content Area:** `ml-56 pt-14`, `bg-gray-100 min-h-screen p-6`
- **Responsive:** sidebar collapses to hamburger menu at `md:` breakpoint

---

## Accessibility
- All interactive elements have visible focus rings: `focus:ring-2 focus:ring-primary-600`
- Minimum touch target: 36px height for buttons/inputs
- Color is never the sole differentiator — badges include text labels
- ARIA labels on icon-only buttons
- Contrast ratio: all text ≥ 4.5:1 against backgrounds

---

## Motion / Animation
- Transitions only on `colors`, `opacity`, `transform` — no layout animations
- `transition-colors duration-150` on all interactive elements
- Modal: `transition-opacity duration-200`
- No heavy effects: no glassmorphism, no gradient backgrounds
