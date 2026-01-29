import React from 'react'
import { Activity, TrendingUp, TrendingDown, Minus, Timer, Route, Calendar, Dumbbell, Flame } from 'lucide-react'

// Mapping av Strava aktivitetstyper til norske navn og ikoner
const activityTypeInfo = {
    'Workout': { name: 'Trening', emoji: '💪' },
    'WeightTraining': { name: 'Styrke', emoji: '🏋️' },
    'Crossfit': { name: 'CrossFit', emoji: '🔥' },
    'HIIT': { name: 'HIIT', emoji: '⚡' },
    'Walk': { name: 'Gåtur', emoji: '🚶' },
    'Hike': { name: 'Fjelltur', emoji: '🥾' },
    'Ride': { name: 'Sykling', emoji: '🚴' },
    'Swim': { name: 'Svømming', emoji: '🏊' },
    'Yoga': { name: 'Yoga', emoji: '🧘' }
}

/**
 * Viser Strava treningshistorikk i et kompakt kort-format
 */
export default function StravaHistoryCard({ analysis, loading = false }) {
    if (loading) {
        return (
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-6 border border-orange-200 dark:border-orange-700">
                <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-orange-500 animate-pulse" />
                    <span className="font-medium text-orange-700 dark:text-orange-300">
                        Henter treningshistorikk fra Strava...
                    </span>
                </div>
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-4 bg-orange-200 dark:bg-orange-700/50 rounded animate-pulse" />
                    ))}
                </div>
            </div>
        )
    }

    if (!analysis || !analysis.hasEnoughData) {
        const totalActivities = (analysis?.totalRuns || 0) + (analysis?.otherWorkouts?.total || 0)
        return (
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-6 border border-orange-200 dark:border-orange-700">
                <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-5 h-5 text-orange-500" />
                    <span className="font-medium text-orange-700 dark:text-orange-300">
                        Strava-historikk
                    </span>
                </div>
                <p className="text-sm text-orange-600 dark:text-orange-400">
                    {totalActivities === 0
                        ? 'Ingen aktiviteter funnet de siste 4 ukene.'
                        : `Kun ${totalActivities} aktivitet(er) funnet. Vi anbefaler minst 4 for best analyse.`
                    }
                </p>
            </div>
        )
    }

    const TrendIcon = analysis.trend === 'increasing' ? TrendingUp
        : analysis.trend === 'decreasing' ? TrendingDown
            : Minus

    const trendColor = analysis.trend === 'increasing' ? 'text-green-600 dark:text-green-400'
        : analysis.trend === 'decreasing' ? 'text-red-600 dark:text-red-400'
            : 'text-gray-600 dark:text-gray-400'

    const trendLabel = analysis.trend === 'increasing' ? 'Oppover'
        : analysis.trend === 'decreasing' ? 'Nedover'
            : 'Stabil'

    return (
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-6 border border-orange-200 dark:border-orange-700">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-orange-500" />
                    <span className="font-semibold text-orange-700 dark:text-orange-300">
                        Siste 4 uker fra Strava
                    </span>
                </div>
                <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
                    <TrendIcon className="w-4 h-4" />
                    <span>{trendLabel}</span>
                </div>
            </div>

            {/* Hovedstatistikk */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                        <Route className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-wide">Totalt</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {analysis.totalKm} km
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        {analysis.totalRuns} løpeturer
                    </div>
                </div>

                <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-wide">Per uke</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {analysis.weeklyAvgKm} km
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        gjennomsnitt
                    </div>
                </div>

                <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                        <Activity className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-wide">Lengste</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {analysis.longestRun} km
                    </div>
                </div>

                <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                        <Timer className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-wide">Tempo</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {analysis.avgPace || '-'}/km
                    </div>
                </div>
            </div>

            {/* Uke-for-uke mini-graf */}
            <div className="mt-4">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                    Uke for uke
                </div>
                <div className="flex items-end gap-1 h-12">
                    {analysis.weekByWeek.map((week, idx) => {
                        const maxKm = Math.max(...analysis.weekByWeek.map(w => w.km), 1)
                        const heightPercent = (week.km / maxKm) * 100
                        const isCurrentWeek = idx === analysis.weekByWeek.length - 1

                        return (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                                <div
                                    className={`w-full rounded-t transition-all ${isCurrentWeek
                                            ? 'bg-orange-500'
                                            : 'bg-orange-300 dark:bg-orange-600'
                                        }`}
                                    style={{ height: `${Math.max(heightPercent, 4)}%` }}
                                    title={`${week.km} km, ${week.runs} løp`}
                                />
                                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                    {idx === 0 ? '-3' : idx === 1 ? '-2' : idx === 2 ? '-1' : 'Nå'}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Andre treningstyper */}
            {analysis.otherWorkouts && analysis.otherWorkouts.total > 0 && (
                <div className="mt-4 pt-4 border-t border-orange-200 dark:border-orange-700/50">
                    <div className="flex items-center gap-2 mb-3">
                        <Dumbbell className="w-4 h-4 text-purple-500" />
                        <span className="text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400">
                            Andre aktiviteter
                        </span>
                        <span className="ml-auto text-sm font-medium text-purple-600 dark:text-purple-400">
                            {analysis.otherWorkouts.total} økter
                        </span>
                    </div>

                    {/* Aktivitetstype-chips */}
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(analysis.otherWorkouts.byType || {}).map(([type, count]) => {
                            const info = activityTypeInfo[type] || { name: type, emoji: '🏃' }
                            return (
                                <div
                                    key={type}
                                    className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-full text-sm"
                                >
                                    <span>{info.emoji}</span>
                                    <span className="text-purple-700 dark:text-purple-300 font-medium">
                                        {info.name}
                                    </span>
                                    <span className="text-purple-500 dark:text-purple-400 text-xs">
                                        ({count})
                                    </span>
                                </div>
                            )
                        })}
                    </div>

                    {/* Total tid på andre aktiviteter */}
                    {analysis.otherWorkouts.totalDuration > 0 && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Timer className="w-3 h-3" />
                            <span>
                                {Math.round(analysis.otherWorkouts.totalDuration / 60)} timer totalt
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Konsistens-indikator */}
            <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Konsistens</span>
                <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${analysis.consistency >= 75 ? 'bg-green-500' :
                                    analysis.consistency >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                            style={{ width: `${analysis.consistency}%` }}
                        />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                        {analysis.consistency}%
                    </span>
                </div>
            </div>
        </div>
    )
}
