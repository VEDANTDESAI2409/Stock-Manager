/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#087F8C',
          50: '#E6F4F5',
          100: '#CCE9EB',
          200: '#99D3D8',
          300: '#66BDC4',
          400: '#33A6B0',
          500: '#087F8C',
          600: '#076D78',
          700: '#05565F',
          800: '#044047',
          900: '#022A2F',
        },
        sidebar: {
          DEFAULT: '#172C2E',
          dark: '#112224',
          hover: '#223B3E',
          active: '#2A464A',
          border: '#274144'
        },
        surface: {
          bg: '#F5F7F8',
          card: '#FFFFFF',
          border: '#E2E8F0',
          hover: '#F1F5F9'
        },
        content: {
          primary: '#172B2D',
          secondary: '#718096',
          muted: '#A0AEC0'
        },
        status: {
          success: '#16A34A',
          warning: '#F59E0B',
          danger: '#DC2626',
          info: '#0284C7'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft-sm': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'soft-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
        'soft-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
      }
    },
  },
  plugins: [],
}
