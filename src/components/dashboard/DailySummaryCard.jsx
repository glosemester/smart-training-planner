import { useState, useEffect, useMemo, useRef } from 'react'
import { useWorkouts } from '../../hooks/useWorkouts'
import { useNutrition } from '../../hooks/useNutrition'
import { generateDailySummary } from '../../services/summaryService'
import { Sparkles, RefreshCw, AlertCircle, TrendingUp, Battery } from 'lucide-react'
import { startOfDay } from 'date-fns'
import GlassCard from '../ui/GlassCard'

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

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
  }, [meals.length, meals.map(m => m.id).join(',')])

  // Get last workout
  const lastWorkout = workouts[0] || null

  // Get today's planned workout
  const todaysPlannedWorkout = useMemo(() => {
    if (!currentPlan?.sessions) return null

    const today = new Date().getDay()
    const todayName = DAY_NAMES[today]

    return currentPlan.sessions.find(s => s.day === todayName && !s.completed) || null
  }, [currentPlan?.id, currentPlan?.sessions?.length])

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
  }, [workouts.length, workouts[0]?.id])

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

  // Safe effect using ref to prevent loops
  const summaryHandlerRef = useRef(handleGenerateSummary)

  // Update ref on every render to ensure it has latest closure
  useEffect(() => {
    summaryHandlerRef.current = handleGenerateSummary
  })

  // Generate summary on mount or meaningful changes
  useEffect(() => {
    // Only generate if we have at least some data
    if (workouts.length === 0) {
      setSummary(null)
      return
    }

    // Apply delay if configured (to stagger AI calls)
    if (delay > 0) {
      const timer = setTimeout(() => {
        summaryHandlerRef.current?.()
      }, delay)
      return () => clearTimeout(timer)
    }

    summaryHandlerRef.current?.()
  }, [workouts.length]) // Only re-run if workout count changes


  // Don't render if no workouts at all
  if (workouts.length === 0) {
    return null
  }

  // Loading state
  if (loading) {
    return (
      <GlassCard className="flex items-center justify-center p-8 border-dashed border-2 border-white/10">
        <div className="text-center">
          <Sparkles className="text-primary animate-pulse mx-auto mb-2" size={24} />
          <p className="text-sm font-medium text-text-secondary">Genererer innsikt...</p>
        </div>
      </GlassCard>
    )
  }

  // Error state
  if (error) {
    return (
      <GlassCard className="bg-destructive/10 border-destructive/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-destructive flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-destructive font-medium">Kunne ikke laste oppsummering</p>
          </div>
          <button
            onClick={() => handleGenerateSummary(true)}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <RefreshCw size={16} className="text-destructive" />
          </button>
        </div>
      </GlassCard>
    )
  }

  // No summary yet
  if (!summary) {
    return (
      <GlassCard
        className="cursor-pointer group flex items-center justify-between"
        hoverEffect
        onClick={handleGenerateSummary}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="text-primary" size={20} />
          </div>
          <div>
            <p className="font-semibold text-text-primary">Få dagens AI-tips</p>
            <p className="text-xs text-text-secondary">Basert på din trening og form</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <Sparkles size={16} className="text-text-muted group-hover:text-primary" />
        </div>
      </GlassCard>
    )
  }

  // Mood colors - Glassmorphism style
  const moodVariant = {
    positive: 'bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20',
    neutral: 'bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20',
    warning: 'bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20'
  }

  const textVariant = {
    positive: 'text-emerald-400',
    neutral: 'text-blue-400',
    warning: 'text-amber-400'
  }

  const variantClass = moodVariant[summary.mood] || moodVariant.neutral
  const textClass = textVariant[summary.mood] || textVariant.neutral

  return (
    <GlassCard className={`${variantClass} transition-colors`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className={`flex items-center gap-2 ${textClass}`}>
          <Sparkles size={18} className="currentColor" />
          <span className="text-xs font-bold uppercase tracking-wider opacity-90">
            Dagens fokus
          </span>
        </div>
        <button
          onClick={() => handleGenerateSummary(true)}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-text-muted hover:text-text-primary"
          title="Oppdater"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <h3 className="font-heading font-bold text-lg mb-3 text-text-primary text-balance text-glow">
        {summary.headline}
      </h3>

      {/* Insights */}
      {summary.insights && summary.insights.length > 0 && (
        <ul className="space-y-2 mb-5">
          {summary.insights.map((insight, idx) => (
            <li key={idx} className="text-sm text-text-secondary flex items-start gap-2.5">
              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${textClass} opacity-80 shrink-0`} />
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Recommendation */}
      {summary.recommendation && (
        <div className="bg-background-main/30 rounded-xl p-4 backdrop-blur-md border border-white/5">
          <div className="flex items-start gap-3">
            <TrendingUp size={18} className={`mt-0.5 ${textClass}`} />
            <p className="text-sm font-medium leading-relaxed text-text-primary">
              {summary.recommendation}
            </p>
          </div>
        </div>
      )}

      {/* Readiness Score */}
      {summary.readinessScore && (
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2 flex-1">
            <Battery size={16} className="text-text-muted" />
            <span className="text-xs font-medium text-text-secondary">Batteri</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${summary.mood === 'positive' ? 'bg-emerald-500' : summary.mood === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`}
                style={{ width: `${summary.readinessScore * 10}%` }}
              />
            </div>
            <span className="text-sm font-bold text-text-primary">{summary.readinessScore}/10</span>
          </div>
        </div>
      )}
    </GlassCard>
  )
}
