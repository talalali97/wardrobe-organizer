import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        accent: {
          DEFAULT: '#fb923c',
          dim: '#3a1f0a',
          edge: '#7a3d10'
        },
        warm: {
          950: '#0e0c09',
          900: '#151210',
          800: '#1d1913',
          700: '#262018',
          600: '#332b22',
        }
      },
      animation: {
        'pulse-soft': 'pulse-soft 1.4s ease-in-out infinite',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        }
      }
    },
  },
  plugins: [],
};

export default config;
