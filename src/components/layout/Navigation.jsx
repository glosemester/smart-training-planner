import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  Calendar,
  Apple,
  MessageCircle,
  Menu,
  X,
  Dumbbell,
  CalendarDays,
  TrendingUp,
  Target
} from 'lucide-react'

const mainNavItems = [
  { to: '/', icon: Home, label: 'Hjem' },
  { to: '/plan', icon: Calendar, label: 'Plan' },
  { to: '/nutrition', icon: Apple, label: 'Mat' },
  { to: '/chat', icon: MessageCircle, label: 'Coach' }
]

const moreMenuItems = [
  { to: '/workouts/new', icon: Dumbbell, label: 'Logg økt', color: 'text-primary' },
  { to: '/workouts', icon: CalendarDays, label: 'Mine økter', color: 'text-secondary' },
  { to: '/calendar', icon: Calendar, label: 'Kalender', color: 'text-hyrox' },
  { to: '/stats', icon: TrendingUp, label: 'Statistikk', color: 'text-success' },
  { to: '/goals', icon: Target, label: 'Mål', color: 'text-warning' },
]

export default function Navigation() {
  const location = useLocation()
  const navigate = useNavigate()
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  const handleMoreItemClick = (to) => {
    navigate(to)
    setShowMoreMenu(false)
  }

  return (
    <>
      {/* Backdrop for more menu */}
      {showMoreMenu && (
        <div
          onClick={() => setShowMoreMenu(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
        />
      )}

      {/* More menu popup */}
      {showMoreMenu && (
        <div className="fixed bottom-20 right-4 left-4 max-w-lg mx-auto z-50 animate-slide-up">
          <div className="bg-white dark:bg-background-card border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/10">
              <h3 className="font-heading font-semibold text-text-primary dark:text-text-primary">
                Flere funksjoner
              </h3>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={20} className="text-text-muted dark:text-text-muted" />
              </button>
            </div>

            {/* Menu items */}
            <div className="p-2">
              {moreMenuItems.map((item) => (
                <button
                  key={item.to}
                  onClick={() => handleMoreItemClick(item.to)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center ${item.color}`}>
                    <item.icon size={20} />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-text-primary group-hover:text-primary transition-colors">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-background-secondary/95 backdrop-blur-xl border-t border-gray-200 dark:border-white/10"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)'
        }}
        aria-label="Hovednavigasjon"
      >
        <div className="max-w-lg mx-auto px-2">
          <div className="flex items-center justify-around h-16">
            {/* Main nav items */}
            {mainNavItems.map(({ to, icon: Icon, label }) => {
              const isActive = location.pathname === to ||
                (to !== '/' && location.pathname.startsWith(to))

              return (
                <NavLink
                  key={to}
                  to={to}
                  aria-label={label}
                  className="flex flex-col items-center justify-center gap-1 px-3 py-1 relative group"
                >
                  {/* Icon */}
                  <Icon
                    size={24}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={`transition-all duration-200 ${
                      isActive
                        ? 'text-primary scale-110'
                        : 'text-gray-600 dark:text-text-muted group-hover:text-gray-900 dark:group-hover:text-text-secondary group-hover:scale-105'
                    }`}
                  />

                  {/* Label */}
                  <span className={`text-[10px] font-medium transition-colors duration-200 ${
                    isActive ? 'text-primary' : 'text-gray-600 dark:text-text-muted'
                  }`}>
                    {label}
                  </span>

                  {/* Active dot indicator */}
                  {isActive && (
                    <div className="absolute bottom-0 w-1 h-1 rounded-full bg-primary animate-pulse" />
                  )}
                </NavLink>
              )
            })}

            {/* More menu button */}
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              aria-label="Mer"
              className="flex flex-col items-center justify-center gap-1 px-3 py-1 relative group"
            >
              <div className={`transition-all duration-200 ${
                showMoreMenu
                  ? 'text-primary scale-110'
                  : 'text-gray-600 dark:text-text-muted group-hover:text-gray-900 dark:group-hover:text-text-secondary group-hover:scale-105'
              }`}>
                {showMoreMenu ? <X size={24} strokeWidth={2.5} /> : <Menu size={24} strokeWidth={2} />}
              </div>

              <span className={`text-[10px] font-medium transition-colors duration-200 ${
                showMoreMenu ? 'text-primary' : 'text-gray-600 dark:text-text-muted'
              }`}>
                Mer
              </span>

              {showMoreMenu && (
                <div className="absolute bottom-0 w-1 h-1 rounded-full bg-primary animate-pulse" />
              )}
            </button>
          </div>
        </div>
      </nav>
    </>
  )
}
