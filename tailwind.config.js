/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // Brand palette — blue is primary, orange is the accent CTA.
        brand: {
          blue: '#3E55A5',
          'blue-hover': '#34488C',
          'blue-dark': '#2A3A72',
          'blue-soft': '#EEF1FA',
          'blue-line': '#DFE4F2',
          'blue-tint': '#F7F8FC',
          orange: '#F48221',
          'orange-hover': '#DB6F14',
          'orange-dark': '#B25A10',
          'orange-soft': '#FDE3CE',
          'orange-line': '#F6C799',
        },
        // Surface tokens for page / section backgrounds.
        surface: {
          page: '#F7F8FC',
          section: '#EEF1FA',
          card: '#FFFFFF',
        },
        ink: {
          50: '#F7F8FC',
          100: '#EEF1FA',
          200: '#DFE4F2',
          300: '#B8C1DA',
          400: '#8894BE',
          500: '#5F6B99',
          600: '#3F4B75',
          700: '#2A3459',
          800: '#1A213C',
          900: '#0F1428',
          950: '#070A17',
        },
        // Category-color remap: legacy Tailwind palette utilities used across
        // the app for "warning/attention" categories are rebound to the
        // brand orange scale so no unrelated hues leak into the UI.
        red: {
          50: '#FEF3EA',
          100: '#FDE3CE',
          200: '#F6C799',
          300: '#F1AA6D',
          400: '#F09148',
          500: '#F48221',
          600: '#DB6F14',
          700: '#B25A10',
          800: '#8A470D',
          900: '#63340A',
          950: '#3B1F06',
        },
        // Neutral warm categories (amber/orange/yellow) → brand orange.
        amber: {
          50: '#FEF3EA',
          100: '#FDE3CE',
          200: '#F6C799',
          300: '#F1AA6D',
          400: '#F09148',
          500: '#F48221',
          600: '#DB6F14',
          700: '#B25A10',
          800: '#8A470D',
          900: '#63340A',
        },
        orange: {
          50: '#FEF3EA',
          100: '#FDE3CE',
          200: '#F6C799',
          300: '#F1AA6D',
          400: '#F09148',
          500: '#F48221',
          600: '#DB6F14',
          700: '#B25A10',
          800: '#8A470D',
          900: '#63340A',
        },
        // Cool categories (indigo/blue) → brand blue.
        indigo: {
          50: '#EEF1FA',
          100: '#DFE4F2',
          200: '#C1CBE6',
          300: '#9DAAD5',
          400: '#7688C2',
          500: '#5568AF',
          600: '#3E55A5',
          700: '#34488C',
          800: '#2A3A72',
          900: '#1F2B57',
          950: '#131A38',
        },
      },
      boxShadow: {
        // Very subtle, almost invisible — cards should feel lifted, not chunky.
        card: '0 1px 2px rgba(15, 20, 40, 0.04), 0 1px 1px rgba(15, 20, 40, 0.03)',
        elev: '0 8px 24px rgba(31, 43, 87, 0.08), 0 2px 6px rgba(31, 43, 87, 0.05)',
        'blue-glow': '0 8px 24px rgba(62, 85, 165, 0.18)',
        'orange-glow': '0 8px 24px rgba(244, 130, 33, 0.22)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};
