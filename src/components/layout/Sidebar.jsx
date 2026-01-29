import { NavLink } from 'react-router-dom'
import {
    Home,
    Calendar,
    Dumbbell,
    Apple,
    MessageCircle,
    TrendingUp,
    Target,
    LogOut,
    Settings,
    Sun,
    Moon
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../contexts/ThemeContext'

const navItems = [
    { to: '/', icon: Home, label: 'Hjem' },
    { to: '/plan', icon: Calendar, label: 'Plan' },
    { to: '/workouts', icon: Dumbbell, label: 'Økter' },
    { to: '/nutrition', icon: Apple, label: 'Mat' },
    { to: '/chat', icon: MessageCircle, label: 'Coach' },
    { to: '/stats', icon: TrendingUp, label: 'Statistikk' },
    { to: '/goals', icon: Target, label: 'Mål' },
]

export default function Sidebar() {
    const { signOut } = useAuth()
    const { theme, toggleTheme } = useTheme()
    const isDark = theme === 'dark'

    return (
        <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 border-r border-white/5 bg-surface z-50">
            {/* Logo */}
            <div className="p-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(185,228,60,0.3)]">
                        <span className="text-black font-bold text-lg">RC</span>
                    </div>
                    <h1 className="font-heading font-bold text-xl text-white tracking-tight">
                        RunCoach
                    </h1>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar py-6">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-300 group ${isActive
                                ? 'bg-primary text-black font-bold shadow-lg shadow-primary/20'
                                : 'text-text-secondary hover:bg-white/5 hover:text-white'
                            }`
                        }
                    >
                        <item.icon
                            size={20}
                            className={`transition-transform duration-200 group-hover:scale-110 ${
                                // Icon color is handled by parent text color now (black when active, gray/white when inactive)
                                ''
                                }`}
                        />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Footer Actions */}
            <div className="p-4 border-t border-white/5 space-y-2">
                <button
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-text-secondary hover:bg-white/5 hover:text-text-primary transition-all duration-200"
                >
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                    <span>{isDark ? 'Lys modus' : 'Mørk modus'}</span>
                </button>

                <button
                    onClick={signOut}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-text-secondary hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                >
                    <LogOut size={20} />
                    <span>Logg ut</span>
                </button>
            </div>
        </aside>
    )
}
