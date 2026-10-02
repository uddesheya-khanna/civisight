import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#F7F8FA',
        surface: '#FFFFFF',
        border: '#E5E7EB',
        brand: {
          DEFAULT: '#1E3A8A',
          hover: '#1E40AF',
          light: '#EFF6FF',
        },
        slate: {
          text: '#0F172A',
          muted: '#475569',
        },
        severity: {
          low: {
            text: '#15803D',
            bg: '#DCFCE7',
            border: '#86EFAC',
          },
          moderate: {
            text: '#B45309',
            bg: '#FEF3C7',
            border: '#FCD34D',
          },
          high: {
            text: '#B91C1C',
            bg: '#FEE2E2',
            border: '#FCA5A5',
          },
          gray: {
            text: '#475569',
            bg: '#F1F5F9',
            border: '#CBD5E1',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
