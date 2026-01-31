import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../contexts/ThemeContext'
import { LogOut, Sun, Moon, Bell } from 'lucide-react'
import { requestNotificationPermission } from '../../services/notificationService'

export default function Header() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <header className="sticky top-0 z-50 glass safe-top">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo/Tittel */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-light flex items-center justify-center">
            <span className="text-white font-bold text-sm">RC</span>
          </div>
          <h1 className="font-heading font-bold text-lg text-text-primary">
            RunCoach
          </h1>
        </div>

        {/* User menu */}
        <div className="flex items-center gap-2">
          {user?.photoURL && (
            <img
              src={user.photoURL}
              alt={user.displayName || 'Bruker'}
              className="w-8 h-8 rounded-full border-2 border-white/10"
            />
          )}

          {/* Notifications toggle */}
          <button
            onClick={() => requestNotificationPermission()}
            className="p-2 rounded-lg hover:bg-white/5 text-text-muted hover:text-text-primary transition-colors"
            title="Aktiver varsler"
          >
            <Bell size={20} />
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-white/5 dark:hover:bg-white/5 text-text-muted dark:text-text-muted hover:text-text-primary dark:hover:text-text-primary transition-colors"
            title={isDark ? 'Bytt til lys modus' : 'Bytt til mørk modus'}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button
            onClick={signOut}
            className="p-2 rounded-lg hover:bg-white/5 dark:hover:bg-white/5 text-text-muted dark:text-text-muted hover:text-text-primary dark:hover:text-text-primary transition-colors"
            title="Logg ut"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  )
}
