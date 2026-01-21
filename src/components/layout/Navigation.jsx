import { NavLink, useLocation } from 'react-router-dom'
import { Home, Calendar, CalendarDays, Apple, MessageCircle, Plus } from 'lucide-react'

const navItems = [
  { to: '/', icon: Home, label: 'Hjem' },
  { to: '/plan', icon: Calendar, label: 'Plan' },
  { to: '/workouts/new', icon: Plus, label: 'Logg', isAction: true },
  { to: '/nutrition', icon: Apple, label: 'Mat' },
  { to: '/chat', icon: MessageCircle, label: 'Coach' }
]

export default function Navigation() {
  const location = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background-secondary/95 backdrop-blur-xl border-t border-white/10"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)'
      }}
      aria-label="Hovednavigasjon"
    >
      <div className="max-w-lg mx-auto px-2">
        <div className="flex items-center justify-around h-16 relative">
          {navItems.map(({ to, icon: Icon, label, isAction }) => {
            const isActive = location.pathname === to ||
              (to !== '/' && location.pathname.startsWith(to))

            if (isAction) {
              return (
                <NavLink
                  key={to}
                  to={to}
                  aria-label={label}
                  className="flex items-center justify-center -mt-8
                    bg-gradient-to-br from-primary to-primary-dark
                    rounded-full w-14 h-14
                    shadow-lg shadow-primary/30
                    hover:shadow-xl hover:shadow-primary/40
                    active:scale-95 transition-all duration-200
                    hover:scale-105"
                >
                  <Icon size={24} strokeWidth={2.5} className="text-white" />
                </NavLink>
              )
            }

            return (
              <NavLink
                key={to}
                to={to}
                aria-label={label}
                className="flex flex-col items-center justify-center gap-1 px-2 py-1 relative group"
              >
                {/* Icon */}
                <Icon
                  size={24}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={`transition-all duration-200 ${
                    isActive
                      ? 'text-primary scale-110'
                      : 'text-text-muted group-hover:text-text-secondary group-hover:scale-105'
                  }`}
                />

                {/* Label */}
                <span className={`text-[9px] font-medium transition-colors duration-200 ${
                  isActive ? 'text-primary' : 'text-text-muted'
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
        </div>
      </div>
    </nav>
  )
}
