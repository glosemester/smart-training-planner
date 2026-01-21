import { NavLink } from 'react-router-dom'
import { Home, Calendar, Apple, MessageCircle, Plus } from 'lucide-react'

const navItems = [
  { to: '/', icon: Home, label: 'Hjem' },
  { to: '/plan', icon: Calendar, label: 'Plan' },
  { to: '/workouts/new', icon: Plus, label: 'Logg', isAction: true },
  { to: '/nutrition', icon: Apple, label: 'Mat' },
  { to: '/chat', icon: MessageCircle, label: 'Coach' }
]

export default function Navigation() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 glass"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)'
      }}
      aria-label="Hovednavigasjon"
    >
      <div className="max-w-lg mx-auto px-2">
        <div className="flex items-center justify-around py-2">
          {navItems.map(({ to, icon: Icon, label, isAction }) => (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              className={({ isActive }) => {
                if (isAction) {
                  return `flex flex-col items-center gap-0.5 p-2 -mt-4
                    bg-primary rounded-full w-14 h-14 justify-center
                    shadow-glow-primary transition-transform active:scale-95`
                }
                return isActive ? 'nav-item-active' : 'nav-item hover:text-text-secondary'
              }}
            >
              <Icon size={isAction ? 24 : 22} strokeWidth={isAction ? 2.5 : 2} aria-hidden="true" />
              {!isAction && (
                <span className="text-[10px] font-medium">{label}</span>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
