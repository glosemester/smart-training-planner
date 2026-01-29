import { useMemo } from 'react'
import { Activity, Flame, Clock, MapPin } from 'lucide-react'
import GlassCard from '../ui/GlassCard'

export default function WeeklyProgress({ workouts, weeklyGoal = 5 }) {
    const stats = useMemo(() => {
        const now = new Date()
        // Calculate stats for current week
        // ... logic to calculate stats ...
        const thisWeekWorkouts = workouts.filter(w => {
            const d = new Date(w.date)
            const diff = now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)
            const weekStart = new Date(now.setDate(diff))
            weekStart.setHours(0, 0, 0, 0)
            return d >= weekStart
        })

        let totalMinutes = 0
        let totalKm = 0
        let totalCalories = 0

        thisWeekWorkouts.forEach(w => {
            totalMinutes += w.duration || 0
            if (w.running?.distance) totalKm += w.running.distance
            // Mock calories if not present, or use actual
            totalCalories += (w.calories || (w.duration * 8)) // Rough estimate
        })

        return {
            count: thisWeekWorkouts.length,
            minutes: totalMinutes,
            km: Math.round(totalKm * 10) / 10,
            calories: Math.round(totalCalories)
        }
    }, [workouts])

    const progressPercentage = Math.min(100, (stats.count / weeklyGoal) * 100)
    const radius = 50
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (progressPercentage / 100) * circumference

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-bold text-white">Your Progress</h2>
                <span className="text-primary text-sm font-medium hover:underline cursor-pointer">View All</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Weekly Goal Ring */}
                <GlassCard className="flex flex-col items-center justify-center p-6 relative">
                    <div className="relative w-40 h-40 flex items-center justify-center">
                        {/* Background Circle */}
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="80"
                                cy="80"
                                r={radius}
                                stroke="currentColor"
                                strokeWidth="12"
                                fill="transparent"
                                className="text-white/10"
                            />
                            {/* Progress Circle */}
                            <circle
                                cx="80"
                                cy="80"
                                r={radius}
                                stroke="currentColor"
                                strokeWidth="12"
                                fill="transparent"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                className="text-primary transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold text-white">{stats.count}</span>
                            <span className="text-xs text-text-secondary uppercase tracking-wider">of {weeklyGoal} workouts</span>
                        </div>
                    </div>
                    <p className="mt-2 font-medium text-white">Weekly Goal</p>
                </GlassCard>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <StatsBox icon={Flame} value={stats.calories} label="kcal" color="text-orange-400" />
                    <StatsBox icon={Activity} value={"142"} label="Avg BPM" color="text-red-400" /> {/* Mock BPM for now */}
                    <StatsBox icon={Clock} value={Math.round(stats.minutes / 60 * 10) / 10} label="Hours" color="text-blue-400" />
                    <StatsBox icon={MapPin} value={stats.km} label="Km" color="text-green-400" />
                </div>
            </div>
        </div>
    )
}

function StatsBox({ icon: Icon, value, label, color }) {
    return (
        <GlassCard className="flex flex-col items-start justify-center p-4">
            <div className={`p-2 rounded-full bg-white/5 mb-2 ${color}`}>
                <Icon size={18} className="currentColor" />
            </div>
            <span className="text-xl font-bold text-white mb-0.5">{value}</span>
            <span className="text-xs text-text-secondary uppercase font-medium">{label}</span>
        </GlassCard>
    )
}
