import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useWorkouts } from '../../hooks/useWorkouts'
import { getWorkoutType } from '../../data/workoutTypes'
import { format, isToday, isYesterday, startOfWeek, endOfWeek, differenceInDays } from 'date-fns'
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
import NutritionWidget from './NutritionWidget'
import VitalGoals from './VitalGoals'

export default function Dashboard() {
  const { userProfile } = useAuth()
  const { workouts, currentPlan, loading, getStats } = useWorkouts()

  const firstName = userProfile?.displayName?.split(' ')[0] || 'der'

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
  }, [workouts])

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
  }, [currentPlan])

  const recentWorkouts = workouts.slice(0, 3)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner" />
      </div>
    )
  }

  // Calculate Streak
  const currentStreak = useMemo(() => {
    if (workouts.length === 0) return 0
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sortedWorkouts = [...workouts].sort((a, b) => new Date(b.date) - new Date(a.date))
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
  }, [workouts])

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Minimal Header */}
      <div className="flex items-end justify-between px-2">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-text-muted mb-1 uppercase tracking-wider">
            {format(new Date(), 'EEEE d. MMM', { locale: nb })}
          </p>
          <h1 className="font-heading text-3xl font-bold text-gray-900 dark:text-white">
            Hei, {firstName}
          </h1>
        </div>

        {/* Streak Badge */}
        <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-500/10 px-3 py-1.5 rounded-full">
          <Flame size={18} className="text-orange-500" />
          <span className="font-bold text-orange-600 dark:text-orange-400">{currentStreak}</span>
        </div>
      </div>

      {/* Primary Action / Next Workout */}
      {nextWorkout ? (
        <section>
          <div className="flex items-center justify-between px-2 mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Neste økt</h2>
            <Link to="/plan" className="text-sm text-primary hover:text-primary-dark font-medium">
              Se plan
            </Link>
          </div>
          <Link to="/plan" className="block group">
            <div className="card bg-primary text-white border-none shadow-xl shadow-primary/20 relative overflow-hidden group-hover:shadow-2xl group-hover:shadow-primary/30 transition-all duration-300">
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-sm font-medium">
                    {nextWorkout.isToday ? 'I dag' : nextWorkout.isTomorrow ? 'I morgen' : format(new Date().setDate(new Date().getDate() + nextWorkout.daysAway), 'EEEE', { locale: nb })}
                  </div>
                  <div className="p-2 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors">
                    <ArrowRight size={20} />
                  </div>
                </div>

                <h3 className="text-2xl font-bold mb-2">{nextWorkout.title}</h3>
                <p className="text-white/80 mb-6 line-clamp-1">{nextWorkout.description}</p>

                <div className="flex gap-4">
                  <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                    <Clock size={16} />
                    <span className="font-medium">{nextWorkout.duration_minutes} min</span>
                  </div>
                  {nextWorkout.details?.distance_km && (
                    <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                      <MapPin size={16} />
                      <span className="font-medium">{nextWorkout.details.distance_km} km</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/3 -translate-y-1/3" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full -translate-x-1/3 translate-y-1/3" />
            </div>
          </Link>
        </section>
      ) : (
        <section className="px-2">
          <div className="card bg-gray-50 dark:bg-white/5 border-dashed border-2 flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="text-gray-400 mb-2" size={32} />
            <p className="text-gray-600 dark:text-gray-400 font-medium">Ingen planlagte økter</p>
            <Link to="/plan" className="mt-4 btn-primary text-sm">
              Generer plan
            </Link>
          </div>
        </section>
      )}

      {/* Week Progress Grid */}
      <section>
        <h2 className="px-2 text-lg font-semibold text-gray-900 dark:text-white mb-3">Denne uken</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="card bg-gray-50 dark:bg-white/5 border-none">
            <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-gray-400">
              <Activity size={16} />
              <span className="text-xs font-medium uppercase">Økter</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {weekStats.workouts} <span className="text-sm font-normal text-gray-400">/ 5</span>
            </p>
          </div>
          <div className="card bg-gray-50 dark:bg-white/5 border-none">
            <div className="flex items-center gap-2 mb-2 text-gray-500 dark:text-gray-400">
              <MapPin size={16} />
              <span className="text-xs font-medium uppercase">Distanse</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {weekStats.runningKm} <span className="text-sm font-normal text-gray-400">km</span>
            </p>
          </div>
        </div>
      </section>

      {/* AI Summary - Staggered load to save quota */}
      <DailySummaryCard delay={1500} />

      {/* Nutrition Teaser */}
      <NutritionWidget />

      {/* Recent Workouts List */}
      <section>
        <div className="flex items-center justify-between px-2 mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Siste økter</h2>
          <Link to="/workouts" className="text-sm text-primary hover:text-primary-dark font-medium">
            Se alle
          </Link>
        </div>
        <div className="space-y-3">
          {recentWorkouts.map(workout => (
            <WorkoutMiniCard key={workout.id} workout={workout} />
          ))}
          <Link to="/workouts/new" className="card border-dashed border-2 flex items-center justify-center gap-2 py-4 text-gray-500 hover:text-primary hover:border-primary hover:bg-primary/5 transition-colors group">
            <Plus size={20} className="group-hover:scale-110 transition-transform" />
            <span className="font-medium">Logg ny økt</span>
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
    <Link to={`/workouts/${workout.id}`} className="card flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ backgroundColor: `${type.color}15`, color: type.color }}
      >
        {type.icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-gray-900 dark:text-white truncate">
          {workout.title || type.name}
        </h4>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>{isToday(date) ? 'I dag' : format(date, 'd. MMM', { locale: nb })}</span>
          {workout.duration && <span>{workout.duration} min</span>}
          {workout.running?.distance && <span>{workout.running.distance} km</span>}
        </div>
      </div>
      <ChevronRight size={18} className="text-gray-300 group-hover:text-primary transition-colors" />
    </Link>
  )
}
