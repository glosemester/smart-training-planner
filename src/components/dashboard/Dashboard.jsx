import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useWorkouts } from '../../hooks/useWorkouts'
import { getWorkoutType } from '../../data/workoutTypes'
import { format, isToday, isTomorrow, isYesterday, startOfWeek, endOfWeek, differenceInDays } from 'date-fns'
import { nb } from 'date-fns/locale'
import {
  Calendar,
  TrendingUp,
  Clock,
  MapPin,
  ChevronRight,
  Flame,
  Target,
  Zap,
  Award,
  Activity
} from 'lucide-react'
import DailySummaryCard from './DailySummaryCard'
import NutritionWidget from './NutritionWidget'
import DateTimeDisplay from './DateTimeDisplay'
import VitalGoals from './VitalGoals'

export default function Dashboard() {
  const { userProfile } = useAuth()
  const { workouts, currentPlan, loading, getStats } = useWorkouts()

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

  // Siste 28 dagers statistikk
  const monthStats = useMemo(() => getStats(28), [getStats])

  // Neste planlagte økt
  const nextWorkout = useMemo(() => {
    if (!currentPlan?.sessions) return null
    
    const today = new Date()
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const todayIndex = today.getDay()
    
    // Finn neste ugjorte økt
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

  // Siste treningsøkter
  const recentWorkouts = workouts.slice(0, 3)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner" />
      </div>
    )
  }

  const firstName = userProfile?.displayName?.split(' ')[0] || 'der'

  // Beregn streak (påfølgende dager med trening)
  const currentStreak = useMemo(() => {
    if (workouts.length === 0) return 0

    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Sorter workouts etter dato (nyeste først)
    const sortedWorkouts = [...workouts].sort((a, b) => new Date(b.date) - new Date(a.date))

    // Sjekk om det er en workout i dag eller i går
    const lastWorkoutDate = new Date(sortedWorkouts[0].date)
    lastWorkoutDate.setHours(0, 0, 0, 0)
    const daysSinceLastWorkout = differenceInDays(today, lastWorkoutDate)

    if (daysSinceLastWorkout > 1) return 0

    // Tell påfølgende dager
    let checkDate = new Date(today)
    if (daysSinceLastWorkout === 1) {
      checkDate.setDate(checkDate.getDate() - 1)
    }

    for (let i = 0; i < sortedWorkouts.length; i++) {
      const workoutDate = new Date(sortedWorkouts[i].date)
      workoutDate.setHours(0, 0, 0, 0)

      if (workoutDate.getTime() === checkDate.getTime()) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (workoutDate < checkDate) {
        break
      }
    }

    return streak
  }, [workouts])

  // Ukesmål progress (antar 4-5 økter per uke som mål)
  const weeklyGoal = 5
  const weekProgress = Math.min((weekStats.workouts / weeklyGoal) * 100, 100)

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-dark to-secondary p-6 text-white">
        <div className="relative z-10">
          <p className="text-sm opacity-90 mb-1">
            {format(new Date(), 'EEEE d. MMMM', { locale: nb })}
          </p>
          <h1 className="font-heading text-3xl font-bold mb-2">
            Hei, {firstName}! 👋
          </h1>
          <p className="text-white/90 mb-6">
            {getGreetingMessage()}
          </p>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <Flame size={20} className="mx-auto mb-1" />
              <p className="text-2xl font-bold">{currentStreak}</p>
              <p className="text-xs opacity-80">Dager streak</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <Activity size={20} className="mx-auto mb-1" />
              <p className="text-2xl font-bold">{weekStats.workouts}</p>
              <p className="text-xs opacity-80">Økter denne uke</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <Award size={20} className="mx-auto mb-1" />
              <p className="text-2xl font-bold">{monthStats.totalWorkouts}</p>
              <p className="text-xs opacity-80">Økter i mnd</p>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24" />
      </div>

      {/* Ukens fremgang */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-heading font-semibold text-text-primary dark:text-text-primary">
              Ukens fremgang
            </h3>
            <p className="text-sm text-text-muted dark:text-text-muted">
              {weekStats.workouts} av {weeklyGoal} økter fullført
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-heading font-bold text-primary">
              {Math.round(weekProgress)}%
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-3 bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-500"
            style={{ width: `${weekProgress}%` }}
          />
        </div>

        {/* Detailed stats */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="text-center">
            <p className="text-lg font-bold text-text-primary dark:text-text-primary">
              {weekStats.runningKm}
            </p>
            <p className="text-xs text-text-muted dark:text-text-muted">km løpt</p>
          </div>
          <div className="text-center border-x border-gray-200 dark:border-white/10">
            <p className="text-lg font-bold text-text-primary dark:text-text-primary">
              {weekStats.hours}
            </p>
            <p className="text-xs text-text-muted dark:text-text-muted">timer trent</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-text-primary dark:text-text-primary">
              {weekStats.strengthSessions}
            </p>
            <p className="text-xs text-text-muted dark:text-text-muted">styrkeøkter</p>
          </div>
        </div>
      </div>

      {/* Vital Goals */}
      <VitalGoals />

      {/* Neste planlagte økt */}
      {nextWorkout && (
        <Link to="/plan" className="block group">
          <div className="card bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20 hover:scale-[1.02] transition-all duration-200">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="text-secondary" size={18} />
              <p className="text-xs text-secondary font-medium uppercase tracking-wide">
                {nextWorkout.isToday ? '🔥 I dag' : nextWorkout.isTomorrow ? 'I morgen' : `Om ${nextWorkout.daysAway} dager`}
              </p>
            </div>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-heading font-bold text-xl text-text-primary dark:text-text-primary mb-2">
                  {nextWorkout.title}
                </h3>
                <p className="text-sm text-text-secondary dark:text-text-secondary mb-3 line-clamp-2">
                  {nextWorkout.description}
                </p>
                <div className="flex items-center gap-4 text-sm text-text-muted dark:text-text-muted">
                  <span className="flex items-center gap-1.5">
                    <Clock size={16} />
                    {nextWorkout.duration_minutes} min
                  </span>
                  {nextWorkout.details?.distance_km && (
                    <span className="flex items-center gap-1.5">
                      <MapPin size={16} />
                      {nextWorkout.details.distance_km} km
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="text-secondary group-hover:translate-x-1 transition-transform" size={24} />
            </div>
          </div>
        </Link>
      )}

      {/* AI Daily Summary */}
      <DailySummaryCard />

      {/* Nutrition Widget */}
      <NutritionWidget />

      {/* Siste økter */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-semibold text-xl text-text-primary dark:text-text-primary">
            Nylige økter
          </h2>
          <Link to="/workouts" className="text-sm text-primary hover:text-primary-light font-medium">
            Se alle
          </Link>
        </div>

        {recentWorkouts.length > 0 ? (
          <div className="space-y-3">
            {recentWorkouts.map(workout => (
              <WorkoutMiniCard key={workout.id} workout={workout} />
            ))}
          </div>
        ) : (
          <div className="card text-center py-12">
            <Activity className="mx-auto mb-3 text-text-muted dark:text-text-muted" size={48} />
            <p className="text-text-muted dark:text-text-muted mb-4">Ingen treningsøkter ennå</p>
            <Link to="/workouts/new" className="btn-primary inline-flex">
              Logg din første økt
            </Link>
          </div>
        )}
      </div>

      {/* Monthly Summary Card */}
      <Link to="/stats" className="block group">
        <div className="card bg-gradient-to-br from-success/10 to-success/5 border-success/20 hover:scale-[1.02] transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-lg text-text-primary dark:text-text-primary">
              Siste 4 uker
            </h3>
            <TrendingUp className="text-success" size={20} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-3xl font-heading font-bold text-text-primary dark:text-text-primary">
                {monthStats.totalWorkouts}
              </p>
              <p className="text-sm text-text-muted dark:text-text-muted">økter totalt</p>
            </div>
            <div>
              <p className="text-3xl font-heading font-bold text-text-primary dark:text-text-primary">
                {monthStats.totalRunningKm}
              </p>
              <p className="text-sm text-text-muted dark:text-text-muted">km løpt</p>
            </div>
            <div>
              <p className="text-3xl font-heading font-bold text-text-primary dark:text-text-primary">
                {monthStats.avgRPE}
              </p>
              <p className="text-sm text-text-muted dark:text-text-muted">snitt RPE</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
            <span className="text-sm text-text-muted dark:text-text-muted">Se detaljert statistikk</span>
            <ChevronRight className="text-success group-hover:translate-x-1 transition-transform" size={18} />
          </div>
        </div>
      </Link>
    </div>
  )
}

function WorkoutMiniCard({ workout }) {
  const type = getWorkoutType(workout.type)
  const date = new Date(workout.date)

  return (
    <Link to={`/workouts/${workout.id}`} className="card hover:scale-[1.01] hover:shadow-lg transition-all duration-200 group">
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: `${type.color}20` }}
        >
          {type.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading font-semibold text-text-primary dark:text-text-primary truncate mb-1">
            {workout.title || type.name}
          </p>
          <div className="flex items-center gap-2 text-xs text-text-muted dark:text-text-muted flex-wrap">
            <span className="font-medium">
              {isToday(date) ? '🔥 I dag' : isYesterday(date) ? 'I går' : format(date, 'd. MMM', { locale: nb })}
            </span>
            {workout.duration && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {workout.duration} min
                </span>
              </>
            )}
            {workout.running?.distance && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {workout.running.distance} km
                </span>
              </>
            )}
            {workout.rpe && (
              <>
                <span>•</span>
                <span>RPE {workout.rpe}/10</span>
              </>
            )}
          </div>
        </div>
        <ChevronRight size={20} className="text-text-muted dark:text-text-muted group-hover:translate-x-1 group-hover:text-primary transition-all flex-shrink-0" />
      </div>
    </Link>
  )
}

function getGreetingMessage() {
  const hour = new Date().getHours()
  const messages = {
    morning: [
      'Klar for en morgenøkt?',
      'Morgenen er din - gjør den kraftfull!',
      'Start dagen med en knallhard økt!'
    ],
    midday: [
      'Hva skal du trene i dag?',
      'Tid for å pushe grensene dine!',
      'La oss gjøre i dag episk!'
    ],
    afternoon: [
      'Tid for en treningsøkt?',
      'Få ut energien - bli sterkere!',
      'Push deg selv i dag!'
    ],
    evening: [
      'Hvordan gikk dagens trening?',
      'Håper du knuste det i dag!',
      'Bra jobba i dag!'
    ]
  }

  let timeOfDay
  if (hour < 10) timeOfDay = 'morning'
  else if (hour < 14) timeOfDay = 'midday'
  else if (hour < 18) timeOfDay = 'afternoon'
  else timeOfDay = 'evening'

  const messageArray = messages[timeOfDay]
  return messageArray[Math.floor(Math.random() * messageArray.length)]
}
