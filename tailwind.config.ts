import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border:      'hsl(var(--border))',
        input:       'hsl(var(--input))',
        ring:        'hsl(var(--ring))',
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // ── Truleado brand — "Indigo & Ember" (docs/brand-guidelines.html) ──
        // Violet Ink ramp (brand primary). 700 = #2A2760 is the primary.
        brand: {
          50: '#EEEDF8', 100: '#D9D7F0', 200: '#B8B5E0', 300: '#9894CC', 400: '#6D69AA',
          500: '#4D489A', 600: '#3A3578', 700: '#2A2760', 800: '#1E1C4A', 900: '#16143A',
          DEFAULT: '#2A2760',
        },
        // Ember Red ramp (accent). One per viewport. 500 = #D93D2A is the primary.
        ember: {
          50: '#FEF2F0', 100: '#FDDDD9', 200: '#F9B5AC', 300: '#F48A7C', 400: '#EC5F4C',
          500: '#D93D2A', 600: '#B82E1D', 700: '#961F11', 800: '#741409', 900: '#4A0C04',
          DEFAULT: '#D93D2A',
        },
        // Semantic aliases used across the app (class name kept, value = brand palette).
        // `gold` is now Violet Ink — a legacy bridge so existing bg-gold/text-gold adopt brand.
        gold:  { DEFAULT: '#2A2760', bg: '#EEEDF8', border: '#9894CC' },
        green: { DEFAULT: '#1F8048', bg: '#EAF5EE', border: '#86CFA0' }, // success
        red:   { DEFAULT: '#D93D2A', bg: '#FEF2F0', border: '#F48A7C' }, // error (ember)
        blue:  { DEFAULT: '#4D489A', bg: '#EEEDF8', border: '#9894CC' }, // info (brand ramp)
        amber: { DEFAULT: '#C17B20', bg: '#FDF4E4', border: '#F0C070' }, // warning
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        // Fraunces = marketing display only; Inter = all app UI; JetBrains Mono = data/IDs/handles
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        mono:  ["'JetBrains Mono'", "'Fira Code'", 'monospace'],
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up':   { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'dot-bounce': {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%':           { transform: 'translateY(-5px)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'dot-bounce':     'dot-bounce 1.2s infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
