import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/presentation/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        kiot: {
          blue: {
            DEFAULT: '#0066CC',
            hover: '#0052A3',
            light: '#EFF6FF',
            dark: '#004C99',
          },
          green: {
            DEFAULT: '#16A34A',
            hover: '#15803D',
            light: '#DCFCE7',
          },
          bg: '#F4F5F7',
          surface: '#FFFFFF',
          border: '#E2E8F0',
          header: '#0066CC',
        },
        primary: {
          DEFAULT: '#2563EB', // Tracking Blue
          hover: '#1D4ED8',
          light: '#DBEAFE',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#EA580C', // Delivery Orange
          hover: '#C2410C',
          light: '#FFEDD5',
          foreground: '#FFFFFF',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F8FAFC',
          subtle: '#EFF6FF',
          dark: '#0F172A',
        },
        status: {
          created: '#64748B',
          athub: '#2563EB',
          outfordelivery: '#D97706',
          delivered: '#16A34A',
          failedattempt: '#DC2626',
          returnpending: '#9333EA',
          returned: '#7C3AED',
          cancelled: '#475569',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
        card: '0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 4px 6px -1px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};

export default config;

