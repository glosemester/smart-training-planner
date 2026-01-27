import { NavLink, useLocation } from 'react-router-dom'
import {
  Home,
  Calendar,
  Plus,
  Apple,
  MessageCircle,
} from 'lucide-react'

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
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-background-secondary/80 backdrop-blur-xl border-t border-gray-200 dark:border-white/5"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)'
      }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map(({ to, icon: Icon, label, isAction }) => {
          const isActive = location.pathname === to ||
            (to !== '/' && location.pathname.startsWith(to) && to !== '/workouts/new')

          if (isAction) {
            return (
              <NavLink
                key={to}
                to={to}
                className="flex flex-col items-center justify-center -mt-6"
              >
                <div className="w-14 h-14 rounded-full bg-primary text-white shadow-lg shadow-primary/30 flex items-center justify-center transform transition-transform duration-200 active:scale-95">
                  <Icon size={28} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-medium text-gray-500 mt-1">
                  {label}
                </span>
              </NavLink>
            )
          }

          return (
            <NavLink
              key={to}
              to={to}
              className="flex flex-col items-center justify-center gap-1 w-14 py-1 group"
            >
              <Icon
                size={24}
                strokeWidth={isActive ? 2.5 : 2}
                className={`transition-all duration-200 ${isActive
                    ? 'text-primary scale-110'
                    : 'text-gray-400 dark:text-text-muted group-hover:text-gray-600 dark:group-hover:text-text-secondary'
                  }`}
              />
              <span className={`text-[10px] font-medium transition-colors duration-200 ${isActive ? 'text-primary' : 'text-gray-400 dark:text-text-muted'
                }`}>
                {label}
              </span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
