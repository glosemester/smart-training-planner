import { NavLink, useLocation } from 'react-router-dom'
import { Home, Calendar, CalendarDays, Apple, MessageCircle, Plus } from 'lucide-react'

const navItems = [
  { to: '/', icon: Home, label: 'Hjem' },
  { to: '/plan', icon: Calendar, label: 'Plan' },
  { to: '/calendar', icon: CalendarDays, label: 'Kalender' },
  { to: '/workouts/new', icon: Plus, label: 'Logg', isAction: true },
  { to: '/nutrition', icon: Apple, label: 'Mat' },
  { to: '/chat', icon: MessageCircle, label: 'Coach' }
]

export default function Navigation() {
  const location = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/5"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)'
      }}
      aria-label="Hovednavigasjon"
    >
      <div className="max-w-lg mx-auto px-4">
        <div className="flex items-center justify-around py-3 relative">
          {navItems.map(({ to, icon: Icon, label, isAction }) => {
            const isActive = location.pathname === to ||
              (to !== '/' && location.pathname.startsWith(to))

            if (isAction) {
              return (
                <NavLink
                  key={to}
                  to={to}
                  aria-label={label}
                  className="flex flex-col items-center gap-0.5 p-3 -mt-6
                    bg-gradient-to-br from-primary to-primary-dark
                    rounded-full w-16 h-16 justify-center
                    shadow-lg shadow-primary/50
                    hover:shadow-xl hover:shadow-primary/60
                    active:scale-95 transition-all duration-300
                    hover:scale-110 hover:-translate-y-1"
                >
                  <Icon size={26} strokeWidth={2.5} aria-hidden="true" className="text-white" />
                </NavLink>
              )
            }

            return (
              <NavLink
                key={to}
                to={to}
                aria-label={label}
                className={`
                  flex flex-col items-center gap-1 px-3 py-2 rounded-xl
                  transition-all duration-300 relative group
                  ${isActive
                    ? 'text-primary'
                    : 'text-text-muted hover:text-text-secondary'
                  }
                `}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
                )}

                {/* Icon with bounce animation when active */}
                <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 2}
                    aria-hidden="true"
                    className={isActive ? 'animate-pulse-subtle' : ''}
                  />
                </div>

                {/* Label with fade effect */}
                <span className={`
                  text-[10px] font-medium transition-all duration-300
                  ${isActive ? 'font-bold' : 'font-normal'}
                `}>
                  {label}
                </span>

                {/* Hover ripple effect */}
                <div className={`
                  absolute inset-0 rounded-xl bg-white/5
                  opacity-0 group-hover:opacity-100 transition-opacity duration-300
                `} />
              </NavLink>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
