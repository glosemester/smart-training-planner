import { NavLink, useLocation } from 'react-router-dom'
import {
  Home,
  Calendar,
  Plus,

  MessageCircle,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: Home, label: 'Hjem' },
  { to: '/plan', icon: Calendar, label: 'Plan' }
]

export default function Navigation() {
  const location = useLocation()

  return (
    <nav
      className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-auto max-w-[90vw]"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      <div className="flex items-center gap-1 p-2 rounded-[2rem] bg-background-surface/80 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50">
        {navItems.map(({ to, icon: Icon, label, isAction }) => {
          const isActive = location.pathname === to ||
            (to !== '/' && location.pathname.startsWith(to) && to !== '/workouts/new')

          if (isAction) {
            return (
              <NavLink
                key={to}
                to={to}
                className="mx-2"
              >
                <div className="w-12 h-12 rounded-full bg-primary text-white shadow-lg shadow-primary/40 flex items-center justify-center transform transition-all duration-200 active:scale-90 hover:scale-105 hover:rotate-90">
                  <Icon size={24} strokeWidth={2.5} />
                </div>
              </NavLink>
            )
          }

          return (
            <NavLink
              key={to}
              to={to}
              className={`
                relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300
                ${isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 2}
                className={`transition-all duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(234,88,12,0.5)]' : ''}`}
              />
              {isActive && (
                <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary animate-pulse-subtle" />
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
