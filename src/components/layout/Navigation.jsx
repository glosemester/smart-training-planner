import { NavLink, useLocation } from 'react-router-dom'
import {
  Home,
  Calendar,
  Plus,
  BarChart3,
  MessageCircle,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: Home, label: 'Hjem' },
  { to: '/plan', icon: Calendar, label: 'Plan' },
  { to: '/workouts/new', icon: Plus, label: 'Logg', isAction: true },
  { to: '/stats', icon: BarChart3, label: 'Stats' },
  { to: '/chat', icon: MessageCircle, label: 'Coach' }
]

export default function Navigation() {
  const location = useLocation()

  return (
    <nav
      className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-auto max-w-[95vw] safe-bottom"
    >
      <div className="flex items-center gap-1 px-3 py-2 rounded-[2rem] bg-surface/95 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/60">
        {navItems.map(({ to, icon: Icon, label, isAction }) => {
          const isActive = location.pathname === to ||
            (to !== '/' && location.pathname.startsWith(to) && to !== '/workouts/new')

          if (isAction) {
            return (
              <NavLink
                key={to}
                to={to}
                className="mx-1"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-lime-400 text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center transform transition-all duration-300 active:scale-90 hover:scale-110 hover:shadow-primary/50 hover:rotate-90">
                  <Icon size={22} strokeWidth={2.5} />
                </div>
              </NavLink>
            )
          }

          return (
            <NavLink
              key={to}
              to={to}
              className={`
                group relative flex flex-col items-center justify-center w-14 h-12 rounded-2xl transition-all duration-300
                ${isActive
                  ? 'text-primary'
                  : 'text-text-muted hover:text-text-primary'
                }
              `}
            >
              {/* Background glow for active state */}
              {isActive && (
                <div className="absolute inset-0 bg-primary/10 rounded-2xl" />
              )}

              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 2}
                className={`relative z-10 transition-all duration-300 ${isActive ? 'drop-shadow-[0_0_8px_rgba(185,228,60,0.6)]' : 'group-hover:scale-110'}`}
              />

              {/* Label */}
              <span className={`relative z-10 text-[10px] font-medium mt-0.5 transition-all duration-300 ${isActive ? 'text-primary' : ''}`}>
                {label}
              </span>

              {/* Active indicator dot */}
              {isActive && (
                <span className="absolute -top-1 right-2 w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-lg shadow-primary/50" />
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
