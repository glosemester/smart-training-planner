import { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, startOfWeek, endOfWeek, isSameMonth, isToday, isSameDay, isPast, differenceInDays } from 'date-fns'
import { nb } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Clock, MapPin, CheckCircle, Edit, TrendingUp, Target, Flame } from 'lucide-react'
import { useWorkouts } from '../../hooks/useWorkouts'
import { getWorkoutType } from '../../data/workoutTypes'
import { useNavigate } from 'react-router-dom'

export default function TrainingCalendar() {
  const { plans, workouts, updatePlanSession } = useWorkouts()
  const navigate = useNavigate()
  const [startDate, setStartDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('month') // 'month' or 'week'
  const [selectedDate, setSelectedDate] = useState(null)
  const [showDayDetail, setShowDayDetail] = useState(false)
  const [loading, setLoading] = useState(false)

  // Generate 6 months of dates
  const monthsToShow = useMemo(() => {
    const months = []
    for (let i = 0; i < 6; i++) {
      const monthDate = addMonths(startOfMonth(startDate), i)
      months.push(monthDate)
    }
    return months
  }, [startDate])

  // Get all sessions and workouts for a specific date
  const getSessionsForDate = (date) => {
    const sessions = []

    // Find planned sessions from plans
    plans.forEach(plan => {
      if (!plan.sessions) return

      const weekStart = plan.weekStart?.toDate?.() || new Date(plan.weekStart)

      plan.sessions.forEach(session => {
        // Map day to actual date
        const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(session.day)
        if (dayIndex === -1) return

        const sessionDate = new Date(weekStart)
        sessionDate.setDate(weekStart.getDate() + dayIndex)

        if (isSameDay(sessionDate, date)) {
          sessions.push({
            ...session,
            source: 'plan',
            status: session.status || 'planned'
          })
        }
      })
    })

    // Add completed workouts
    workouts.forEach(workout => {
      const workoutDate = workout.date?.toDate?.() || new Date(workout.date)

      if (isSameDay(workoutDate, date)) {
        sessions.push({
          ...workout,
          source: 'workout',
          status: 'completed'
        })
      }
    })

    return sessions
  }

  const goToToday = () => {
    setStartDate(new Date())
  }

  const goToPreviousMonth = () => {
    setStartDate(prev => addMonths(prev, -1))
  }

  const goToNextMonth = () => {
    setStartDate(prev => addMonths(prev, 1))
  }

  const handleDayClick = (date, sessions) => {
    if (sessions.length > 0) {
      setSelectedDate(date)
      setShowDayDetail(true)
    }
  }

  const handleMarkCompleted = async (session) => {
    try {
      setLoading(true)

      // Find the plan that contains this session
      const plan = plans.find(p =>
        p.sessions?.some(s => s.id === session.id)
      )

      if (!plan) {
        throw new Error('Could not find plan for session')
      }

      // Update session status to completed
      await updatePlanSession(plan.id, session.id, {
        status: 'completed',
        completedAt: new Date()
      })

      console.log('✅ Session marked as completed')
    } catch (error) {
      console.error('Failed to mark session as completed:', error)
      alert('Kunne ikke markere økten som fullført. Prøv igjen.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogWorkout = () => {
    setShowDayDetail(false)
    navigate('/workouts/new')
  }

  const selectedSessions = selectedDate ? getSessionsForDate(selectedDate) : []

  // Calculate completion statistics
  const stats = useMemo(() => {
    const today = new Date()
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    const monthStart = startOfMonth(today)

    let weekPlanned = 0
    let weekCompleted = 0
    let monthPlanned = 0
    let monthCompleted = 0

    // Count planned vs completed for current week and month
    plans.forEach(plan => {
      if (!plan.sessions) return

      const planWeekStart = plan.weekStart?.toDate?.() || new Date(plan.weekStart)

      plan.sessions.forEach(session => {
        const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(session.day)
        if (dayIndex === -1) return

        const sessionDate = new Date(planWeekStart)
        sessionDate.setDate(planWeekStart.getDate() + dayIndex)

        // Only count past and today sessions
        if (sessionDate > today) return

        // Week stats
        if (sessionDate >= weekStart && sessionDate <= today) {
          weekPlanned++
          if (session.status === 'completed') weekCompleted++
        }

        // Month stats
        if (sessionDate >= monthStart && sessionDate <= today) {
          monthPlanned++
          if (session.status === 'completed') monthCompleted++
        }
      })
    })

    // Calculate streak
    let currentStreak = 0
    let bestStreak = 0
    let tempStreak = 0
    let lastWorkoutDate = null

    // Get all workout dates (from both completed sessions and logged workouts)
    const workoutDates = new Set()

    // Add completed sessions
    plans.forEach(plan => {
      if (!plan.sessions) return
      const planWeekStart = plan.weekStart?.toDate?.() || new Date(plan.weekStart)

      plan.sessions.forEach(session => {
        if (session.status === 'completed') {
          const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].indexOf(session.day)
          if (dayIndex !== -1) {
            const sessionDate = new Date(planWeekStart)
            sessionDate.setDate(planWeekStart.getDate() + dayIndex)
            workoutDates.add(format(sessionDate, 'yyyy-MM-dd'))
          }
        }
      })
    })

    // Add logged workouts
    workouts.forEach(workout => {
      const workoutDate = workout.date?.toDate?.() || new Date(workout.date)
      workoutDates.add(format(workoutDate, 'yyyy-MM-dd'))
    })

    // Sort dates and calculate streaks
    const sortedDates = Array.from(workoutDates).sort().reverse()

    for (let i = 0; i < sortedDates.length; i++) {
      const currentDate = new Date(sortedDates[i])

      if (lastWorkoutDate === null) {
        // First workout
        const daysDiff = differenceInDays(today, currentDate)
        if (daysDiff <= 1) {
          // Today or yesterday
          tempStreak = 1
          currentStreak = 1
        } else {
          tempStreak = 1
        }
      } else {
        const daysDiff = differenceInDays(lastWorkoutDate, currentDate)
        if (daysDiff === 1) {
          // Consecutive day
          tempStreak++
          if (currentStreak > 0) currentStreak++
        } else {
          // Gap in streak
          if (currentStreak > 0) {
            // End current streak
            currentStreak = 0
          }
          tempStreak = 1
        }
      }

      if (tempStreak > bestStreak) {
        bestStreak = tempStreak
      }

      lastWorkoutDate = currentDate
    }

    return {
      weekCompleted,
      weekPlanned,
      weekRate: weekPlanned > 0 ? Math.round((weekCompleted / weekPlanned) * 100) : 0,
      monthCompleted,
      monthPlanned,
      monthRate: monthPlanned > 0 ? Math.round((monthCompleted / monthPlanned) * 100) : 0,
      currentStreak,
      bestStreak
    }
  }, [plans, workouts])

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <CalendarIcon size={28} className="text-primary" />
              Treningskalender
            </h1>
            <p className="text-text-muted text-sm mt-1">
              6 måneder fremover med planlagte og fullførte økter
            </p>
          </div>
          <button
            onClick={goToToday}
            className="btn-secondary px-4 py-2 text-sm"
          >
            I dag
          </button>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-lg bg-background-secondary hover:bg-background-tertiary transition-colors"
          >
            <ChevronLeft size={20} className="text-text-secondary" />
          </button>

          <div className="text-center">
            <p className="text-lg font-semibold text-white">
              {format(startDate, 'MMMM yyyy', { locale: nb })}
            </p>
            <p className="text-xs text-text-muted">
              Viser 6 måneder
            </p>
          </div>

          <button
            onClick={goToNextMonth}
            className="p-2 rounded-lg bg-background-secondary hover:bg-background-tertiary transition-colors"
          >
            <ChevronRight size={20} className="text-text-secondary" />
          </button>
        </div>

        {/* Completion Statistics */}
        <div className="grid grid-cols-3 gap-3">
          {/* Week completion */}
          <div className="bg-background-secondary rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Target size={16} className="text-primary" />
              <span className="text-xs font-medium text-text-muted">Uke</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-white">{stats.weekRate}%</span>
              <span className="text-[10px] text-text-muted mt-0.5">
                {stats.weekCompleted}/{stats.weekPlanned} økter
              </span>
            </div>
          </div>

          {/* Month completion */}
          <div className="bg-background-secondary rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-secondary" />
              <span className="text-xs font-medium text-text-muted">Måned</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-white">{stats.monthRate}%</span>
              <span className="text-[10px] text-text-muted mt-0.5">
                {stats.monthCompleted}/{stats.monthPlanned} økter
              </span>
            </div>
          </div>

          {/* Streak */}
          <div className="bg-background-secondary rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Flame size={16} className="text-warning" />
              <span className="text-xs font-medium text-text-muted">Streak</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-white">{stats.currentStreak}</span>
              <span className="text-[10px] text-text-muted mt-0.5">
                {stats.currentStreak === 1 ? 'dag' : 'dager'} (best: {stats.bestStreak})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid - 6 months */}
      <div className="space-y-8">
        {monthsToShow.map((monthDate, monthIndex) => (
          <MonthView
            key={monthIndex}
            monthDate={monthDate}
            getSessionsForDate={getSessionsForDate}
            onDayClick={handleDayClick}
          />
        ))}
      </div>

      {/* Day Detail Modal */}
      {showDayDetail && selectedDate && (
        <DayDetailModal
          date={selectedDate}
          sessions={selectedSessions}
          onClose={() => setShowDayDetail(false)}
          onMarkCompleted={handleMarkCompleted}
          onLogWorkout={handleLogWorkout}
          loading={loading}
        />
      )}
    </div>
  )
}

function MonthView({ monthDate, getSessionsForDate, onDayClick }) {
  const monthStart = startOfMonth(monthDate)
  const monthEnd = endOfMonth(monthDate)

  // Get calendar grid (include previous/next month days to fill weeks)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 }) // Sunday

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // Group into weeks
  const weeks = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  return (
    <div className="bg-background-secondary rounded-2xl p-4 border border-white/5">
      {/* Month header */}
      <h2 className="text-lg font-bold text-white mb-4 capitalize">
        {format(monthDate, 'MMMM yyyy', { locale: nb })}
      </h2>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'].map((day, i) => (
          <div
            key={i}
            className="text-center text-xs font-medium text-text-muted py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="space-y-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((day, dayIndex) => {
              const sessions = getSessionsForDate(day)
              const isCurrentMonth = isSameMonth(day, monthDate)
              const isCurrentDay = isToday(day)

              return (
                <DayCell
                  key={dayIndex}
                  date={day}
                  sessions={sessions}
                  isCurrentMonth={isCurrentMonth}
                  isToday={isCurrentDay}
                  onClick={() => onDayClick(day, sessions)}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function DayCell({ date, sessions, isCurrentMonth, isToday, onClick }) {
  const dayNumber = format(date, 'd')

  // Count sessions by status
  const planned = sessions.filter(s => s.status === 'planned').length
  const completed = sessions.filter(s => s.status === 'completed').length
  const total = sessions.length

  return (
    <div
      onClick={onClick}
      className={`
        relative aspect-square rounded-lg p-1 transition-all
        ${isCurrentMonth ? 'bg-background-tertiary' : 'bg-background-secondary/50'}
        ${isToday ? 'ring-2 ring-primary' : 'border border-white/5'}
        ${total > 0 ? 'hover:scale-105 cursor-pointer active:scale-95' : ''}
      `}
    >
      {/* Day number */}
      <div
        className={`
          text-xs font-medium text-center mb-1
          ${isToday ? 'text-primary font-bold' : isCurrentMonth ? 'text-white' : 'text-text-muted'}
        `}
      >
        {dayNumber}
      </div>

      {/* Session indicators */}
      {total > 0 && (
        <div className="flex flex-col gap-0.5 items-center">
          {/* Show first 3 sessions as colored dots */}
          {sessions.slice(0, 3).map((session, idx) => {
            const workoutType = getWorkoutType(session.type)
            const isCompleted = session.status === 'completed'

            return (
              <div
                key={idx}
                className={`
                  w-1 h-1 rounded-full
                  ${isCompleted ? 'bg-success' : workoutType.color}
                `}
                title={session.title || workoutType.name}
              />
            )
          })}

          {/* Show count if more than 3 */}
          {total > 3 && (
            <div className="text-[8px] text-text-muted font-medium mt-0.5">
              +{total - 3}
            </div>
          )}
        </div>
      )}

      {/* Status badge for completed days */}
      {completed > 0 && (
        <div className="absolute top-0.5 right-0.5">
          <div className="w-1.5 h-1.5 rounded-full bg-success" />
        </div>
      )}
    </div>
  )
}

function DayDetailModal({ date, sessions, onClose, onMarkCompleted, onLogWorkout, loading }) {
  const formattedDate = format(date, 'EEEE d. MMMM yyyy', { locale: nb })
  const isPastDate = isPast(date) && !isToday(date)

  // Group by status
  const planned = sessions.filter(s => s.status === 'planned')
  const completed = sessions.filter(s => s.status === 'completed')

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-background-secondary rounded-3xl w-full max-w-lg max-h-[80vh] overflow-y-auto border border-white/10 shadow-2xl pb-8">
        {/* Header */}
        <div className="sticky top-0 bg-background-secondary border-b border-white/10 p-4 flex items-center justify-between rounded-t-3xl">
          <div>
            <h2 className="text-lg font-bold text-white capitalize">
              {formattedDate}
            </h2>
            <p className="text-sm text-text-muted">
              {sessions.length} økt{sessions.length !== 1 ? 'er' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-background-tertiary hover:bg-background-primary transition-colors"
            aria-label="Lukk"
          >
            <X size={20} className="text-text-secondary" />
          </button>
        </div>

        {/* Sessions list */}
        <div className="p-4 space-y-4">
          {/* Completed sessions */}
          {completed.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-success mb-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success" />
                Fullført ({completed.length})
              </h3>
              <div className="space-y-2">
                {completed.map((session, idx) => (
                  <SessionCard
                    key={idx}
                    session={session}
                    onMarkCompleted={null}
                    loading={loading}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Planned sessions */}
          {planned.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                Planlagt ({planned.length})
              </h3>
              <div className="space-y-2">
                {planned.map((session, idx) => (
                  <SessionCard
                    key={idx}
                    session={session}
                    onMarkCompleted={onMarkCompleted}
                    loading={loading}
                    showCompleteButton={isPastDate || isToday(date)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          {planned.length > 0 && (isPastDate || isToday(date)) && (
            <div className="pt-2 border-t border-white/10">
              <button
                onClick={onLogWorkout}
                className="btn-secondary w-full py-3 flex items-center justify-center gap-2"
              >
                <Edit size={18} />
                Logg ny økt
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SessionCard({ session, onMarkCompleted, loading, showCompleteButton }) {
  const workoutType = getWorkoutType(session.type)
  const isCompleted = session.status === 'completed'

  return (
    <div
      className={`
        p-4 rounded-xl border transition-all
        ${isCompleted
          ? 'bg-success/5 border-success/20'
          : 'bg-background-tertiary border-white/10'
        }
      `}
    >
      {/* Type and title */}
      <div className="flex items-start gap-3 mb-2">
        <div className={`text-2xl flex-shrink-0 ${isCompleted ? 'grayscale-0' : ''}`}>
          {workoutType.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white text-sm">
            {session.title || workoutType.name}
          </h4>
          <p className={`text-xs ${isCompleted ? 'text-success' : 'text-text-muted'}`}>
            {workoutType.name}
          </p>
        </div>
        {session.duration_minutes && (
          <div className="flex items-center gap-1 text-xs text-text-muted">
            <Clock size={12} />
            {session.duration_minutes} min
          </div>
        )}
      </div>

      {/* Description */}
      {session.description && (
        <p className="text-sm text-text-secondary mt-2 line-clamp-2">
          {session.description}
        </p>
      )}

      {/* Running details */}
      {session.running && (
        <div className="flex items-center gap-3 mt-3 text-xs text-text-muted">
          {session.running.distance && (
            <span>{session.running.distance} km</span>
          )}
          {session.running.avgPace && (
            <span>{session.running.avgPace} min/km</span>
          )}
          {session.running.surface && (
            <div className="flex items-center gap-1">
              <MapPin size={12} />
              <span className="capitalize">{session.running.surface}</span>
            </div>
          )}
        </div>
      )}

      {/* Details */}
      {session.details && (
        <div className="flex items-center gap-3 mt-3 text-xs text-text-muted">
          {session.details.distance_km && (
            <span>{session.details.distance_km} km</span>
          )}
          {session.details.intensity && (
            <span className="capitalize">{session.details.intensity}</span>
          )}
          {session.details.location && (
            <div className="flex items-center gap-1">
              <MapPin size={12} />
              <span>{session.details.location}</span>
            </div>
          )}
        </div>
      )}

      {/* RPE */}
      {session.rpe && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-text-muted">RPE:</span>
          <div className="flex gap-0.5">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < session.rpe
                    ? 'bg-primary'
                    : 'bg-white/10'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-white">{session.rpe}/10</span>
        </div>
      )}

      {/* Complete button */}
      {showCompleteButton && onMarkCompleted && !isCompleted && (
        <button
          onClick={() => onMarkCompleted(session)}
          disabled={loading}
          className="mt-3 w-full btn-primary py-2 text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CheckCircle size={16} />
          {loading ? 'Markerer...' : 'Marker som fullført'}
        </button>
      )}
    </div>
  )
}
