import { useState, useEffect, useMemo } from 'react'
import { useWorkouts } from '../../hooks/useWorkouts'
import { useNutrition } from '../../hooks/useNutrition'
import { generateDailySummary } from '../../services/summaryService'
import { Sparkles, RefreshCw, AlertCircle, TrendingUp, Battery } from 'lucide-react'
import { startOfDay, isToday } from 'date-fns'

export default function DailySummaryCard() {
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

    handleGenerateSummary()
  }, []) // Run once on mount

  const handleGenerateSummary = async () => {
    setLoading(true)
    setError(null)

    try {
      const data = {
        lastWorkout,
        todaysNutrition,
        weekStats,
        todaysPlannedWorkout
      }

      const result = await generateDailySummary(data)
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
      <div className="card bg-gradient-to-br from-secondary/20 to-secondary/5 border-secondary/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
            <Sparkles className="text-secondary animate-pulse" size={20} />
          </div>
          <div>
            <p className="text-sm text-secondary font-medium">AI Oppsummering</p>
            <p className="text-xs text-text-muted mt-0.5">Analyserer dine data...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="card bg-error/10 border-error/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-error flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-error font-medium">Kunne ikke laste oppsummering</p>
            <p className="text-xs text-text-muted mt-1">{error}</p>
          </div>
          <button
            onClick={handleGenerateSummary}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            aria-label="Prøv igjen"
          >
            <RefreshCw size={16} className="text-text-muted" />
          </button>
        </div>
      </div>
    )
  }

  // No summary yet
  if (!summary) {
    return (
      <div className="card border-secondary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
              <Sparkles className="text-secondary" size={20} />
            </div>
            <div>
              <p className="text-sm text-text-primary font-medium">AI Daglig Oppsummering</p>
              <p className="text-xs text-text-muted mt-0.5">Få personlig innsikt</p>
            </div>
          </div>
          <button
            onClick={handleGenerateSummary}
            className="btn-secondary text-sm"
          >
            Generer
          </button>
        </div>
      </div>
    )
  }

  // Mood colors
  const moodColors = {
    positive: { bg: 'bg-success/20', text: 'text-success', border: 'border-success/20' },
    neutral: { bg: 'bg-secondary/20', text: 'text-secondary', border: 'border-secondary/20' },
    warning: { bg: 'bg-warning/20', text: 'text-warning', border: 'border-warning/20' }
  }

  const colors = moodColors[summary.mood] || moodColors.neutral

  return (
    <div className={`card bg-gradient-to-br from-secondary/20 to-secondary/5 ${colors.border}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
            <Sparkles className={colors.text} size={20} />
          </div>
          <div>
            <p className="text-xs text-secondary font-medium uppercase tracking-wide">
              AI Oppsummering
            </p>
            <h3 className="font-heading font-bold text-lg text-text-primary mt-0.5">
              {summary.headline}
            </h3>
          </div>
        </div>
        <button
          onClick={handleGenerateSummary}
          className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          aria-label="Oppdater oppsummering"
          disabled={loading}
        >
          <RefreshCw size={16} className="text-text-muted" />
        </button>
      </div>

      {/* Insights */}
      {summary.insights && summary.insights.length > 0 && (
        <div className="space-y-2 mb-4">
          {summary.insights.map((insight, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm text-text-secondary">
              <span className={`${colors.text} mt-1`}>•</span>
              <span>{insight}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recommendation */}
      {summary.recommendation && (
        <div className={`p-3 ${colors.bg} rounded-xl`}>
          <div className="flex items-start gap-2">
            <TrendingUp className={`${colors.text} flex-shrink-0 mt-0.5`} size={16} />
            <div>
              <p className={`text-xs ${colors.text} font-medium uppercase tracking-wide mb-1`}>
                Anbefaling
              </p>
              <p className="text-sm text-text-primary">
                {summary.recommendation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Readiness Score */}
      {summary.readinessScore && (
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
          <Battery className="text-text-muted" size={16} />
          <div className="flex-1">
            <p className="text-xs text-text-muted">Treningsklarhet</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2 bg-background-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full ${colors.bg} transition-all`}
                  style={{ width: `${summary.readinessScore * 10}%` }}
                />
              </div>
              <span className="text-sm font-medium text-text-primary">
                {summary.readinessScore}/10
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
