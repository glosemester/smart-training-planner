import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      className="relative flex items-center gap-2 px-4 py-3 rounded-xl bg-background-secondary dark:bg-background-secondary transition-all duration-200 hover:scale-105 active:scale-95 group"
      aria-label={isDark ? 'Bytt til lys modus' : 'Bytt til mørk modus'}
    >
      {/* Icon */}
      <div className="relative w-10 h-10 flex items-center justify-center">
        <Sun
          size={20}
          className={`absolute transition-all duration-300 ${
            isDark
              ? 'opacity-0 rotate-90 scale-0'
              : 'opacity-100 rotate-0 scale-100 text-primary'
          }`}
        />
        <Moon
          size={20}
          className={`absolute transition-all duration-300 ${
            isDark
              ? 'opacity-100 rotate-0 scale-100 text-primary'
              : 'opacity-0 -rotate-90 scale-0'
          }`}
        />
      </div>

      {/* Label */}
      <div className="flex flex-col items-start">
        <span className="text-sm font-medium text-text-primary dark:text-text-primary">
          {isDark ? 'Mørk modus' : 'Lys modus'}
        </span>
        <span className="text-xs text-text-muted dark:text-text-muted">
          {isDark ? 'Skån øynene dine' : 'Lett og lys'}
        </span>
      </div>

      {/* Toggle switch */}
      <div className={`
        ml-auto w-12 h-6 rounded-full transition-colors duration-300
        ${isDark ? 'bg-primary' : 'bg-gray-300'}
      `}>
        <div className={`
          w-5 h-5 rounded-full bg-white shadow-md
          transition-transform duration-300 mt-0.5
          ${isDark ? 'translate-x-6' : 'translate-x-0.5'}
        `} />
      </div>
    </button>
  )
}
