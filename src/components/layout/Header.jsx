import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../contexts/ThemeContext'
import { LogOut, Sun, Moon, Bell, Settings } from 'lucide-react'
import { requestNotificationPermission } from '../../services/notificationService'
import { Link } from 'react-router-dom'
import ToolsDropdown from './ToolsDropdown'

export default function Header() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <header className="sticky top-0 z-50 safe-top bg-background/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo/Tittel */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary via-primary to-lime-400 flex items-center justify-center shadow-lg shadow-primary/20 transition-transform hover:scale-105">
            <span className="text-primary-foreground font-bold text-sm">RC</span>
          </div>
          <div>
            <h1 className="font-bold text-lg text-text-primary leading-none">
              RunCoach
            </h1>
            <p className="text-[10px] text-text-muted uppercase tracking-widest">AI Trener</p>
          </div>
        </div>

        {/* User menu */}
        <div className="flex items-center gap-1">
          {user?.photoURL && (
            <img
              src={user.photoURL}
              alt={user.displayName || 'Bruker'}
              className="w-8 h-8 rounded-full border-2 border-primary/30 shadow-lg shadow-primary/10"
            />
          )}

          {/* Tools Dropdown */}
          <ToolsDropdown />

          {/* Integrations Link */}
          <Link
            to="/integrations"
            className="p-2 rounded-xl hover:bg-white/5 text-text-muted hover:text-primary transition-all duration-200"
            title="Integrasjoner"
          >
            <Settings size={18} />
          </Link>

          {/* Notifications toggle */}
          <button
            onClick={() => requestNotificationPermission()}
            className="p-2 rounded-xl hover:bg-white/5 text-text-muted hover:text-primary transition-all duration-200"
            title="Aktiver varsler"
          >
            <Bell size={18} />
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-white/5 text-text-muted hover:text-primary transition-all duration-200"
            title={isDark ? 'Bytt til lys modus' : 'Bytt til mørk modus'}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={signOut}
            className="p-2 rounded-xl hover:bg-white/5 text-text-muted hover:text-red-400 transition-all duration-200"
            title="Logg ut"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}
