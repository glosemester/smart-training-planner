import { useState, useEffect, useMemo } from 'react'
import { useWorkouts } from '../../hooks/useWorkouts'
import { useNutrition } from '../../hooks/useNutrition'
import { generateDailySummary } from '../../services/summaryService'
import { Sparkles, RefreshCw, AlertCircle, TrendingUp, Battery } from 'lucide-react'
import { startOfDay } from 'date-fns'

export default function DailySummaryCard({ delay = 0 }) {
  const { workouts, currentPlan } = useWorkouts()
  const { meals } = useNutrition()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Calculate today's nutrition
  const todaysNutrition = useMemo(() => {
    const today = startOfDay(new Date())
    const todaysMeals = meals.filter(meal => {
      const mealDate = startOfDay(new Date(meal.date))
      return mealDate.getTime() === today.getTime()
    })

    if (todaysMeals.length === 0) return null

    const totals = todaysMeals.reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.nutrition?.totals?.calories || 0),
        protein: acc.protein + (meal.nutrition?.totals?.protein || 0),
        carbs: acc.carbs + (meal.nutrition?.totals?.carbs || 0),
        fat: acc.fat + (meal.nutrition?.totals?.fat || 0)
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    )

    return { totals }
  }, [meals])

  // Get last workout
  const lastWorkout = workouts[0] || null

  // Get today's planned workout
  const todaysPlannedWorkout = useMemo(() => {
    if (!currentPlan?.sessions) return null

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const today = new Date().getDay()
    const todayName = dayNames[today]

    return currentPlan.sessions.find(s => s.day === todayName && !s.completed) || null
  }, [currentPlan])

  // Calculate week stats
  const weekStats = useMemo(() => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const thisWeekWorkouts = workouts.filter(w => new Date(w.date) >= weekAgo)

    let totalKm = 0
    let totalMinutes = 0

    thisWeekWorkouts.forEach(w => {
      totalMinutes += w.duration || 0
      if (w.running?.distance) totalKm += w.running.distance
    })

    return {
      workouts: thisWeekWorkouts.length,
      runningKm: Math.round(totalKm * 10) / 10,
      hours: Math.round(totalMinutes / 60 * 10) / 10
    }
  }, [workouts])

  // Generate summary on mount and when dependencies change
  useEffect(() => {
    // Only generate if we have at least some data
    if (workouts.length === 0) {
      setSummary(null)
      return
    }

    // Apply delay if configured (to stagger AI calls)
    if (delay > 0) {
      const timer = setTimeout(() => {
        handleGenerateSummary()
      }, delay)
      return () => clearTimeout(timer)
    }

    handleGenerateSummary()
  }, []) // Run once on mount

  const handleGenerateSummary = async (isRefresh = false) => {
    setLoading(true)
    setError(null)

    try {
      const data = {
        lastWorkout,
        todaysNutrition,
        weekStats,
        todaysPlannedWorkout
      }

      // Pass true if manual refresh
      const result = await generateDailySummary(data, isRefresh)
      setSummary(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Don't render if no workouts at all
  if (workouts.length === 0) {
    return null
  }

  // Loading state
  if (loading) {
    return (
      <div className="card border-dashed border-2 flex items-center justify-center p-8">
        <div className="text-center">
          <Sparkles className="text-primary animate-pulse mx-auto mb-2" size={24} />
          <p className="text-sm font-medium text-gray-900 dark:text-white">Genererer innsikt...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="card bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-red-700 dark:text-red-400 font-medium">Kunne ikke laste oppsummering</p>
          </div>
          <button
            onClick={() => handleGenerateSummary(true)}
            className="p-1 hover:bg-white/50 rounded-lg transition-colors"
          >
            <RefreshCw size={16} className="text-red-700 dark:text-red-400" />
          </button>
        </div>
      </div>
    )
  }

  // No summary yet
  if (!summary) {
    return (
      <div className="card hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer group" onClick={handleGenerateSummary}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center">
              <Sparkles className="text-purple-600 dark:text-purple-400" size={20} />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">Få dagens AI-tips</p>
              <p className="text-xs text-gray-500">Basert på din trening og form</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-purple-500/20 transition-colors">
            <Sparkles size={16} className="text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
          </div>
        </div>
      </div>
    )
  }

  // Mood colors - Minimalist
  const moodVariant = {
    positive: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-400',
    neutral: 'bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20 text-blue-800 dark:text-blue-400',
    warning: 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-800 dark:text-amber-400'
  }

  const variantClass = moodVariant[summary.mood] || moodVariant.neutral

  return (
    <div className={`card ${variantClass} transition-colors`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="currentColor" />
          <span className="text-xs font-bold uppercase tracking-wider opacity-80">
            Dagens fokus
          </span>
        </div>
        <button
          onClick={() => handleGenerateSummary(true)}
          className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
          title="Oppdater"
        >
          <RefreshCw size={14} className="opacity-60" />
        </button>
      </div>

      <h3 className="font-heading font-bold text-lg mb-2">
        {summary.headline}
      </h3>

      {/* Insights */}
      {summary.insights && summary.insights.length > 0 && (
        <ul className="space-y-1.5 mb-4">
          {summary.insights.map((insight, idx) => (
            <li key={idx} className="text-sm opacity-90 flex items-start gap-2">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-current opacity-60" />
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Recommendation */}
      {summary.recommendation && (
        <div className="bg-white/50 dark:bg-black/10 rounded-xl p-3 backdrop-blur-sm">
          <div className="flex items-start gap-2">
            <TrendingUp size={16} className="mt-0.5 opacity-80" />
            <p className="text-sm font-medium leading-relaxed">
              {summary.recommendation}
            </p>
          </div>
        </div>
      )}

      {/* Readiness Score */}
      {summary.readinessScore && (
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-black/5 dark:border-white/5">
          <div className="flex items-center gap-2 flex-1">
            <Battery size={16} className="opacity-60" />
            <span className="text-xs font-medium opacity-80">Batteri</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-current opacity-80 rounded-full"
                style={{ width: `${summary.readinessScore * 10}%` }}
              />
            </div>
            <span className="text-sm font-bold">{summary.readinessScore}/10</span>
          </div>
        </div>
      )}
    </div>
  )
}
