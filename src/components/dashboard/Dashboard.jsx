import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useWorkouts } from '../../hooks/useWorkouts'
import { getWorkoutType } from '../../data/workoutTypes'
import { format, isToday, startOfWeek, endOfWeek, differenceInDays } from 'date-fns'
import { nb } from 'date-fns/locale'
import {
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  Flame,
  Activity,
  ArrowRight,
  Plus
} from 'lucide-react'
import DailySummaryCard from './DailySummaryCard'
import StravaSummaryCard from './StravaSummaryCard'
import NutritionWidget from './NutritionWidget'
import VitalGoals from './VitalGoals'
import GlassCard from '../ui/GlassCard'
import Button from '../ui/Button'

export default function Dashboard() {
  const { userProfile } = useAuth()
  const { workouts, currentPlan, loading } = useWorkouts()

  const firstName = userProfile?.displayName?.split(' ')[0] || 'Løper'

  // Beregn statistikk for denne uken
  const weekStats = useMemo(() => {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

    const thisWeekWorkouts = workouts.filter(w => {
      const date = new Date(w.date)
      return date >= weekStart && date <= weekEnd
    })

    let totalKm = 0
    let totalMinutes = 0
    let strengthSessions = 0

    thisWeekWorkouts.forEach(w => {
      totalMinutes += w.duration || 0
      if (w.running?.distance) totalKm += w.running.distance
      if (['hyrox', 'crossfit', 'strength'].includes(w.type)) strengthSessions++
    })

    return {
      workouts: thisWeekWorkouts.length,
      runningKm: Math.round(totalKm * 10) / 10,
      hours: Math.round(totalMinutes / 60 * 10) / 10,
      strengthSessions
    }
  }, [workouts.length])

  // Neste planlagte økt
  const nextWorkout = useMemo(() => {
    if (!currentPlan?.sessions) return null

    const today = new Date()
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const todayIndex = today.getDay()

    for (let i = 0; i < 7; i++) {
      const checkDay = dayNames[(todayIndex + i) % 7]
      const session = currentPlan.sessions.find(s =>
        s.day === checkDay && !s.completed && s.type !== 'rest'
      )
      if (session) {
        return {
          ...session,
          isToday: i === 0,
          isTomorrow: i === 1,
          daysAway: i
        }
      }
    }
    return null
  }, [currentPlan?.id, currentPlan?.sessions?.length])

  const recentWorkouts = workouts.slice(0, 3)

  // Calculate Streak
  const currentStreak = useMemo(() => {
    if (workouts.length === 0) return 0
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sortedWorkouts = [...workouts].sort((a, b) => new Date(b.date) - new Date(a.date))

    // Handle edge case if no workouts
    if (!sortedWorkouts[0]) return 0

    const lastWorkoutDate = new Date(sortedWorkouts[0].date)
    lastWorkoutDate.setHours(0, 0, 0, 0)

    if (differenceInDays(today, lastWorkoutDate) > 1) return 0

    let checkDate = new Date(today)
    if (differenceInDays(today, lastWorkoutDate) === 1) checkDate.setDate(checkDate.getDate() - 1)

    for (let i = 0; i < sortedWorkouts.length; i++) {
      const workoutDate = new Date(sortedWorkouts[i].date)
      workoutDate.setHours(0, 0, 0, 0)
      if (workoutDate.getTime() === checkDate.getTime()) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (workoutDate < checkDate) break
    }
    return streak
  }, [workouts.length])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-up pb-24">
      {/* 1. Header (Minimalist) */}
      <div className="flex items-end justify-between px-1">
        <div>
          <p className="text-xs font-medium text-text-secondary mb-1 uppercase tracking-widest">
            {format(new Date(), 'EEEE d. MMM', { locale: nb })}
          </p>
          <h1 className="font-heading text-3xl font-bold text-text-primary tracking-tight">
            Hei, <span className="bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">{firstName}</span>
          </h1>
        </div>

        {/* Streak Badge (Glass) */}
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full backdrop-blur-md">
          <Flame size={16} className="text-primary fill-primary/20" />
          <span className="font-bold text-primary text-sm">{currentStreak}</span>
        </div>
      </div>

      {/* 2. Hero: Daily Summary */}
      <DailySummaryCard delay={1500} />

      {/* 3. Next Workout */}
      {nextWorkout ? (
        <section>
          <div className="flex items-center justify-between px-1 mb-3">
            <h2 className="text-lg font-semibold text-text-primary">Neste økt</h2>
            <Link to="/plan" className="text-xs text-primary hover:text-primary-light font-medium uppercase tracking-wider">
              Se plan
            </Link>
          </div>
          <Link to="/plan" className="block group">
            <GlassCard className="relative overflow-hidden group-hover:shadow-glow-primary transition-all duration-300 border-primary/20 bg-background-surface/60">
              {/* Highlight gradient */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent opacity-80" />

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border border-white/5 
                    ${nextWorkout.isToday
                      ? 'bg-primary/20 text-primary border-primary/20'
                      : 'bg-white/5 text-text-secondary'
                    }`}>
                    {nextWorkout.isToday ? 'I dag' : nextWorkout.isTomorrow ? 'I morgen' : format(new Date().setDate(new Date().getDate() + nextWorkout.daysAway), 'EEEE', { locale: nb })}
                  </div>

                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <ArrowRight size={18} className="text-text-muted group-hover:text-primary" />
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-2 text-text-primary">{nextWorkout.title}</h3>
                <p className="text-text-secondary text-sm mb-5 line-clamp-1">{nextWorkout.description}</p>

                <div className="flex gap-3">
                  <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                    <Clock size={14} className="text-text-muted" />
                    <span className="font-medium text-sm text-text-primary">{nextWorkout.duration_minutes} min</span>
                  </div>
                  {nextWorkout.details?.distance_km && (
                    <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                      <MapPin size={14} className="text-text-muted" />
                      <span className="font-medium text-sm text-text-primary">{nextWorkout.details.distance_km} km</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Decorative Glow */}
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            </GlassCard>
          </Link>
        </section>
      ) : (
        <section>
          <GlassCard className="flex flex-col items-center justify-center py-8 text-center border-dashed border-2 border-white/5 bg-transparent">
            <Calendar className="text-text-muted mb-3 opacity-50" size={32} />
            <p className="text-text-secondary font-medium mb-4">Ingen planlagte økter</p>
            <Link to="/plan">
              <Button size="sm" variant="outline">Generer plan</Button>
            </Link>
          </GlassCard>
        </section>
      )}

      {/* 4. Week Stats Grid (2x2) */}
      <section>
        <h2 className="px-1 text-lg font-semibold text-text-primary mb-3">Denne uken</h2>
        <div className="grid grid-cols-2 gap-3">
          <GlassCard className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-text-muted mb-1">
              <Activity size={14} />
              <span className="text-[10px] uppercase font-bold tracking-wider">Økter</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-text-primary">{weekStats.workouts}</span>
              <span className="text-sm text-text-muted">/ 5</span>
            </div>
          </GlassCard>

          <GlassCard className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-text-muted mb-1">
              <MapPin size={14} />
              <span className="text-[10px] uppercase font-bold tracking-wider">Distanse</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-text-primary">{weekStats.runningKm}</span>
              <span className="text-sm text-text-muted">km</span>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* 5. Integrations & Widgets */}
      <div className="grid gap-6">
        <StravaSummaryCard />
        <NutritionWidget />
      </div>

      {/* 6. Recent Workouts */}
      <section>
        <div className="flex items-center justify-between px-1 mb-3">
          <h2 className="text-lg font-semibold text-text-primary">Siste økter</h2>
          <Link to="/workouts" className="text-xs text-primary hover:text-primary-light font-medium uppercase tracking-wider">
            Se alle
          </Link>
        </div>
        <div className="space-y-3">
          {recentWorkouts.map(workout => (
            <WorkoutMiniCard key={workout.id} workout={workout} />
          ))}
          <Link to="/workouts/new" className="block">
            <GlassCard
              className="border-dashed border-2 border-white/10 bg-transparent flex items-center justify-center gap-2 py-4 group hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              <Plus size={20} className="text-text-muted group-hover:text-primary transition-colors" />
              <span className="font-medium text-text-secondary group-hover:text-primary transition-colors">Logg ny økt</span>
            </GlassCard>
          </Link>
        </div>
      </section>

      {/* Vital Goals */}
      <VitalGoals />
    </div>
  )
}

function WorkoutMiniCard({ workout }) {
  const type = getWorkoutType(workout.type)
  const date = new Date(workout.date)

  return (
    <Link to={`/workouts/${workout.id}`}>
      <GlassCard
        className="flex items-center gap-4 group"
        hoverEffect
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-lg flex-shrink-0 shadow-inner"
          style={{ backgroundColor: `${type.color}15`, color: type.color }}
        >
          {type.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
            {workout.title || type.name}
          </h4>
          <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
            <span>{isToday(date) ? 'I dag' : format(date, 'd. MMM', { locale: nb })}</span>
            {workout.duration && (
              <>
                <span className="w-1 h-1 rounded-full bg-white/10" />
                <span>{workout.duration} min</span>
              </>
            )}
            {workout.running?.distance && (
              <>
                <span className="w-1 h-1 rounded-full bg-white/10" />
                <span>{workout.running.distance} km</span>
              </>
            )}
          </div>
        </div>
        <ChevronRight size={18} className="text-white/10 group-hover:text-primary transition-colors" />
      </GlassCard>
    </Link>
  )
}
