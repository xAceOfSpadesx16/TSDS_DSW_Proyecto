/** @type {import('tailwindcss').Config} */
// Los valores viven en variables CSS de `src/index.css`; Tailwind solo los
// expone como utilidades. La dirección visual es "Papel de goma" (claro).
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--color-canvas)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          hover: 'var(--color-surface-hover)',
          sunken: 'var(--color-surface-sunken)',
        },
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
        action: {
          DEFAULT: 'var(--color-action)',
          hover: 'var(--color-action-hover)',
          active: 'var(--color-action-active)',
          soft: 'var(--color-action-soft)',
        },
        'on-action': 'var(--color-on-action)',
        control: 'var(--color-control-border)',
        focus: 'var(--color-focus)',
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        danger: {
          DEFAULT: 'var(--color-error)',
          dark: 'var(--color-error-strong)',
          active: 'var(--color-error-active)',
        },
        scrim: 'var(--color-scrim)',
        // Alias heredados: las pantallas existentes usan estos nombres.
        primary: {
          DEFAULT: 'var(--color-action)',
          light: 'var(--color-action)',
          dark: 'var(--color-action-hover)',
        },
        secondary: {
          DEFAULT: 'var(--color-success)',
          light: 'var(--color-success)',
        },
        accent: {
          DEFAULT: 'var(--color-action)',
          light: 'var(--color-action)',
          hover: 'var(--color-action-hover)',
        },
        dark: {
          bg: 'var(--color-canvas)',
          'bg-alt': 'var(--color-surface)',
          surface: 'var(--color-surface)',
          'surface-hover': 'var(--color-surface-hover)',
          border: 'var(--color-control-border)',
        },
        light: {
          text: 'var(--color-ink)',
          muted: 'var(--color-muted)',
          inverse: 'var(--color-on-action)',
        },
      },
      fontFamily: {
        sans: ['var(--font-body)'],
        display: ['var(--font-display)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        none: '0',
        sm: 'var(--radius-stamp)',
        DEFAULT: 'var(--radius-chip)',
        md: 'var(--radius-control)',
        lg: 'var(--radius-card)',
        xl: 'var(--radius-card)',
        '2xl': 'var(--radius-card)',
        '3xl': 'var(--radius-card)',
        full: 'var(--radius-pill)',
      },
      boxShadow: {
        low: 'var(--shadow-low)',
        raised: 'var(--shadow-raised)',
        high: 'var(--shadow-high)',
        pressed: 'var(--shadow-pressed)',
      },
    },
  },
  plugins: [],
};
