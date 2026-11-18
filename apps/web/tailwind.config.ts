import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0F172A',
          surface: '#1E293B',
          light: '#3B82F6',
        },
        accent: {
          main: '#0D9488',
          hover: '#0F766E',
          subtle: '#CCFBF1',
        },
        financial: {
          positive: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          neutral: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
