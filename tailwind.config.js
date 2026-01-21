/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Enable dark mode with class strategy
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Bakgrunnsfarger (støtter både mørk og lys modus)
        background: {
          DEFAULT: '#0f0f0f',
          secondary: '#1a1a2e',
          card: '#16213e',
          elevated: '#1f2937',
          // Light mode variants
          light: {
            DEFAULT: '#ffffff',
            secondary: '#f8f9fa',
            card: '#ffffff',
            elevated: '#f1f3f5'
          }
        },
        // Aksentfarger
        primary: {
          DEFAULT: '#ff6b35',
          light: '#ff8c5a',
          dark: '#e55a2b'
        },
        secondary: {
          DEFAULT: '#4361ee',
          light: '#5a7bff',
          dark: '#3651d4'
        },
        // Semantiske farger
        success: '#06d6a0',
        warning: '#ffd166',
        error: '#ef476f',
        // Feature-farger
        ai: '#a855f7',
        nutrition: '#06d6a0',
        recovery: '#64748b',
        // Tekstfarger (støtter både mørk og lys modus)
        text: {
          primary: '#f8f9fa',
          secondary: '#adb5bd',
          muted: '#6c757d',
          // Light mode variants
          light: {
            primary: '#212529',
            secondary: '#495057',
            muted: '#6c757d'
          }
        },
        // Treningstype-farger
        running: '#ff6b35',
        hyrox: '#8b5cf6',
        crossfit: '#10b981',
        strength: '#4361ee',
        rest: '#6c757d'
      },
      fontFamily: {
        heading: ['Outfit', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(255, 107, 53, 0.3)',
        'glow-secondary': '0 0 20px rgba(67, 97, 238, 0.3)',
        'glow-success': '0 0 20px rgba(6, 214, 160, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
