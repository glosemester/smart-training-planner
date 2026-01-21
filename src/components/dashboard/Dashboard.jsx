import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useWorkouts } from '../../hooks/useWorkouts'
import { getWorkoutType } from '../../data/workoutTypes'
import { format, isToday, isTomorrow, isYesterday, startOfWeek, endOfWeek } from 'date-fns'
import { nb } from 'date-fns/locale'
import {
  Calendar,
  TrendingUp,
  Clock,
  MapPin,
  ChevronRight,
  Flame,
  Target
} from 'lucide-react'
import DailySummaryCard from './DailySummaryCard'
import NutritionWidget from './NutritionWidget'

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Greeting */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Hei, {firstName}! 👋
        </h1>
        <p className="text-text-secondary mt-1">
          {getGreetingMessage()}
        </p>
      </div>

      {/* AI Daily Summary */}
      <DailySummaryCard />

      {/* Neste økt */}
      {nextWorkout && (
        <Link to="/plan" className="block">
          <div className="card bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-primary font-medium uppercase tracking-wide">
                  {nextWorkout.isToday ? 'I dag' : nextWorkout.isTomorrow ? 'I morgen' : `Om ${nextWorkout.daysAway} dager`}
                </p>
                <h3 className="font-heading font-bold text-lg text-text-primary mt-1">
                  {nextWorkout.title}
                </h3>
                <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                  {nextWorkout.description}
                </p>
                <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {nextWorkout.duration_minutes} min
                  </span>
                  {nextWorkout.details?.distance_km && (
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {nextWorkout.details.distance_km} km
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="text-primary" size={24} />
            </div>
          </div>
        </Link>
      )}

      {/* Ukens oversikt */}
      <div>
        <h2 className="font-heading font-semibold text-lg text-text-primary mb-3">
          Denne uken
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard 
            icon={<MapPin className="text-running" size={20} />}
            value={`${weekStats.runningKm} km`}
            label="Løpt"
            color="running"
          />
          <StatCard 
            icon={<Clock className="text-secondary" size={20} />}
            value={`${weekStats.hours} t`}
            label="Trent"
            color="secondary"
          />
          <StatCard 
            icon={<Flame className="text-hyrox" size={20} />}
            value={weekStats.workouts}
            label="Økter"
            color="hyrox"
          />
          <StatCard 
            icon={<Target className="text-success" size={20} />}
            value={weekStats.strengthSessions}
            label="Styrke"
            color="success"
          />
        </div>
      </div>

      {/* Nutrition Widget */}
      <NutritionWidget />

      {/* Siste økter */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-semibold text-lg text-text-primary">
            Siste økter
          </h2>
          <Link to="/workouts" className="text-sm text-primary hover:text-primary-light">
            Se alle
          </Link>
        </div>

        {recentWorkouts.length > 0 ? (
          <div className="space-y-2">
            {recentWorkouts.map(workout => (
              <WorkoutMiniCard key={workout.id} workout={workout} />
            ))}
          </div>
        ) : (
          <div className="card text-center py-8">
            <p className="text-text-muted mb-4">Ingen treningsøkter ennå</p>
            <Link to="/workouts/new" className="btn-primary inline-flex">
              Logg din første økt
            </Link>
          </div>
        )}
      </div>

      {/* 4-ukers trend */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-semibold text-lg text-text-primary">
            Siste 4 uker
          </h2>
          <Link to="/stats" className="text-sm text-primary hover:text-primary-light">
            Se detaljer
          </Link>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-value">{monthStats.totalWorkouts}</p>
              <p className="stat-label">Økter totalt</p>
            </div>
            <div className="text-right">
              <p className="stat-value">{monthStats.totalRunningKm} km</p>
              <p className="stat-label">Løpt</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-sm">
            <span className="text-text-muted">Snitt RPE</span>
            <span className="text-text-primary font-medium">{monthStats.avgRPE}/10</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, value, label, color }) {
  // Map color names to Tailwind classes (for JIT compiler compatibility)
  const bgColors = {
    running: 'bg-running/20',
    secondary: 'bg-secondary/20',
    hyrox: 'bg-hyrox/20',
    success: 'bg-success/20',
    primary: 'bg-primary/20'
  }

  return (
    <div className="card">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${bgColors[color] || 'bg-primary/20'} flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <p className="font-heading font-bold text-xl text-text-primary">{value}</p>
          <p className="text-xs text-text-muted">{label}</p>
        </div>
      </div>
    </div>
  )
}

function WorkoutMiniCard({ workout }) {
  const type = getWorkoutType(workout.type)
  const date = new Date(workout.date)

  return (
    <Link to={`/workouts/${workout.id}`} className="card flex items-center gap-3 hover:bg-white/5 transition-colors">
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
        style={{ backgroundColor: `${type.color}20` }}
      >
        {type.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-text-primary truncate">
          {workout.title || type.name}
        </p>
        <p className="text-xs text-text-muted">
          {isToday(date) ? 'I dag' : isYesterday(date) ? 'I går' : format(date, 'd. MMM', { locale: nb })}
          {workout.duration && ` • ${workout.duration} min`}
          {workout.running?.distance && ` • ${workout.running.distance} km`}
        </p>
      </div>
      <ChevronRight size={18} className="text-text-muted" />
    </Link>
  )
}

function getGreetingMessage() {
  const hour = new Date().getHours()
  if (hour < 10) return 'Klar for en morgenøkt?'
  if (hour < 14) return 'Hva skal du trene i dag?'
  if (hour < 18) return 'Tid for en treningsøkt?'
  return 'Hvordan gikk dagens trening?'
}
