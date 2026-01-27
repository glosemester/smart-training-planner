import { NavLink, useLocation } from 'react-router-dom'
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
        <aside className="hidden lg:flex flex-col w-64 h-screen fixed left-0 top-0 border-r border-gray-100 dark:border-white/5 bg-white dark:bg-background-secondary/30 backdrop-blur-xl">
            {/* Logo */}
            <div className="p-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                        <span className="text-white font-bold text-lg">RC</span>
                    </div>
                    <h1 className="font-heading font-bold text-xl text-gray-900 dark:text-white tracking-tight">
                        RunCoach
                    </h1>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar py-6">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-gray-500 dark:text-text-muted hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                            }`
                        }
                    >
                        <item.icon
                            size={20}
                            className="transition-transform duration-200 group-hover:scale-110"
                        />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-100 dark:border-white/5 space-y-2">
                <button
                    onClick={toggleTheme}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 dark:text-text-muted hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-all duration-200"
                >
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                    <span>{isDark ? 'Lys modus' : 'Mørk modus'}</span>
                </button>

                <button
                    onClick={signOut}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 dark:text-text-muted hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-500 transition-all duration-200"
                >
                    <LogOut size={20} />
                    <span>Logg ut</span>
                </button>
            </div>
        </aside>
    )
}
