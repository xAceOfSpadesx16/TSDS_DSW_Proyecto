tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6c5ce7',
          light: '#a29bfe',
          dark: '#4834d4',
        },
        secondary: {
          DEFAULT: '#00cec9',
          light: '#81ecec',
        },
        accent: {
          DEFAULT: '#fd79a8',
          light: '#fab1c7',
          hover: '#e8608f',
        },
        success: '#00b894',
        warning: '#fdcb6e',
        danger: {
          DEFAULT: '#e17055',
          dark: '#d63031',
        },
        dark: {
          bg: '#0f0f1a',
          'bg-alt': '#1a1a2e',
          surface: '#22223a',
          'surface-hover': '#2d2d4a',
          border: '#3a3a5c',
        },
        light: {
          text: '#e8e8f0',
          muted: '#9595b5',
          inverse: '#1a1a2e',
        }
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Fira Code"', '"Cascadia Code"', 'monospace'],
      },
    },
  },
}
