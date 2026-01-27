/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Minimalist Backgrounds
        background: {
          DEFAULT: '#09090b', // Zinc-950
          secondary: '#18181b', // Zinc-900
          card: '#18181b', // Same as secondary for now, distinct via border
          elevated: '#27272a', // Zinc-800
          // Light mode
          light: {
            DEFAULT: '#ffffff',
            secondary: '#f4f4f5', // Zinc-100
            card: '#ffffff',
            elevated: '#ffffff'
          }
        },
        // Primary Accent - International Orange / Vibrant
        primary: {
          DEFAULT: '#ea580c', // Orange-600
          light: '#f97316', // Orange-500
          dark: '#c2410c', // Orange-700
          subtle: 'rgba(234, 88, 12, 0.1)'
        },
        // Secondary/Neutral
        secondary: {
          DEFAULT: '#71717a', // Zinc-500
          light: '#a1a1aa', // Zinc-400
          dark: '#52525b' // Zinc-600
        },
        // Semantic
        success: '#10b981', // Emerald-500
        warning: '#f59e0b', // Amber-500
        error: '#ef4444', // Red-500

        // Activity Colors (Pastel/Muted for minimalism)
        running: '#ea580c', // Orange match
        hyrox: '#eab308', // Yellow-500
        crossfit: '#0ea5e9', // Sky-500
        strength: '#8b5cf6', // Violet-500
        rest: '#71717a', // Zinc-500

        // Text
        text: {
          primary: '#fafafa', // Zinc-50
          secondary: '#a1a1aa', // Zinc-400
          muted: '#52525b', // Zinc-600
          // Light mode
          light: {
            primary: '#09090b',
            secondary: '#52525b',
            muted: '#a1a1aa'
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        // We can keep specific headings if needed, but Inter is great for minimal
        heading: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-primary': '0 0 15px rgba(234, 88, 12, 0.5)', // Matches primary #ea580c
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
