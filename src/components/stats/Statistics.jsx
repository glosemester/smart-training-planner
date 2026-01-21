import { useMemo, useState } from 'react'
import { useWorkouts } from '../../hooks/useWorkouts'
import { BarChart3, TrendingUp, TrendingDown, Calendar, Target, Flame, Activity, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Area, AreaChart
} from 'recharts'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subWeeks, subMonths } from 'date-fns'
import { nb } from 'date-fns/locale'

export default function Statistics() {
  const { workouts, getStats, currentPlan } = useWorkouts()
  const [timeframe, setTimeframe] = useState('weekly') // 'weekly' or 'monthly'

  // Weekly data for charts
  const weeklyData = useMemo(() => {
    const weeks = []
    for (let i = 11; i >= 0; i--) {
      const weekStart = startOfWeek(subDays(new Date(), i * 7), { weekStartsOn: 1 })
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })

      const weekWorkouts = workouts.filter(w => {
        const date = new Date(w.date)
        return date >= weekStart && date <= weekEnd
      })

      let km = 0
      let hours = 0
      let totalRPE = 0
      let rpeCount = 0

      weekWorkouts.forEach(w => {
        if (w.running?.distance) km += w.running.distance
        hours += (w.duration || 0) / 60
        if (w.rpe) {
          totalRPE += w.rpe
          rpeCount++
        }
      })

      weeks.push({
        week: `Uke ${format(weekStart, 'w', { locale: nb })}`,
        km: Math.round(km * 10) / 10,
        hours: Math.round(hours * 10) / 10,
        workouts: weekWorkouts.length,
        avgRPE: rpeCount > 0 ? Math.round((totalRPE / rpeCount) * 10) / 10 : 0
      })
    }
    return weeks
  }, [workouts])

  // Monthly data for charts
  const monthlyData = useMemo(() => {
    const months = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i))
      const monthEnd = endOfMonth(monthStart)

      const monthWorkouts = workouts.filter(w => {
        const date = new Date(w.date)
        return date >= monthStart && date <= monthEnd
      })

      let km = 0
      let hours = 0
      let totalRPE = 0
      let rpeCount = 0

      monthWorkouts.forEach(w => {
        if (w.running?.distance) km += w.running.distance
        hours += (w.duration || 0) / 60
        if (w.rpe) {
          totalRPE += w.rpe
          rpeCount++
        }
      })

      months.push({
        month: format(monthStart, 'MMM', { locale: nb }),
        km: Math.round(km * 10) / 10,
        hours: Math.round(hours * 10) / 10,
        workouts: monthWorkouts.length,
        avgRPE: rpeCount > 0 ? Math.round((totalRPE / rpeCount) * 10) / 10 : 0
      })
    }
    return months
  }, [workouts])

  // Training heatmap data (last 90 days)
  const heatmapData = useMemo(() => {
    const today = new Date()
    const startDate = subDays(today, 89) // 90 days total
    const days = eachDayOfInterval({ start: startDate, end: today })

    return days.map(day => {
      const dayWorkouts = workouts.filter(w => isSameDay(new Date(w.date), day))
      const intensity = dayWorkouts.length > 0 ? Math.min(dayWorkouts.length, 3) : 0

      return {
        date: day,
        workouts: dayWorkouts.length,
        intensity // 0 = none, 1 = light, 2 = moderate, 3+ = high
      }
    })
  }, [workouts])

  // Current period stats
  const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const thisWeekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })
  const lastWeekStart = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 })
  const lastWeekEnd = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 })

  const thisMonthStart = startOfMonth(new Date())
  const thisMonthEnd = endOfMonth(new Date())
  const lastMonthStart = startOfMonth(subMonths(new Date(), 1))
  const lastMonthEnd = endOfMonth(subMonths(new Date(), 1))

  // Calculate this week stats
  const thisWeekWorkouts = workouts.filter(w => {
    const date = new Date(w.date)
    return date >= thisWeekStart && date <= thisWeekEnd
  })

  const lastWeekWorkouts = workouts.filter(w => {
    const date = new Date(w.date)
    return date >= lastWeekStart && date <= lastWeekEnd
  })

  const thisMonthWorkouts = workouts.filter(w => {
    const date = new Date(w.date)
    return date >= thisMonthStart && date <= thisMonthEnd
  })

  const lastMonthWorkouts = workouts.filter(w => {
    const date = new Date(w.date)
    return date >= lastMonthStart && date <= lastMonthEnd
  })

  const calculateStats = (workouts) => {
    let km = 0
    let hours = 0
    let totalRPE = 0
    let rpeCount = 0

    workouts.forEach(w => {
      if (w.running?.distance) km += w.running.distance
      hours += (w.duration || 0) / 60
      if (w.rpe) {
        totalRPE += w.rpe
        rpeCount++
      }
    })

    return {
      workouts: workouts.length,
      km: Math.round(km * 10) / 10,
      hours: Math.round(hours * 10) / 10,
      avgRPE: rpeCount > 0 ? Math.round((totalRPE / rpeCount) * 10) / 10 : 0
    }
  }

  const thisWeekStats = calculateStats(thisWeekWorkouts)
  const lastWeekStats = calculateStats(lastWeekWorkouts)
  const thisMonthStats = calculateStats(thisMonthWorkouts)
  const lastMonthStats = calculateStats(lastMonthWorkouts)

  const stats28 = useMemo(() => getStats(28), [getStats])
  const stats90 = useMemo(() => getStats(90), [getStats])

  // Calculate progress towards plan goal
  const planProgress = useMemo(() => {
    if (!currentPlan?.totalLoad) return null

    const { running_km, strength_sessions } = currentPlan.totalLoad

    return {
      runningTarget: running_km || 0,
      runningCurrent: thisWeekStats.km,
      strengthTarget: strength_sessions || 0,
      strengthCurrent: thisWeekWorkouts.filter(w =>
        ['hyrox', 'crossfit', 'strength'].includes(w.type)
      ).length
    }
  }, [currentPlan, thisWeekStats, thisWeekWorkouts])

  const chartData = timeframe === 'weekly' ? weeklyData : monthlyData
  const xAxisLabel = timeframe === 'weekly' ? 'week' : 'month'

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary flex items-center gap-2">
          <BarChart3 className="text-primary" />
          Statistikk & Analyse
        </h1>
        <p className="text-text-secondary mt-1">
          Detaljert oversikt over din treningsprogress
        </p>
      </div>

      {/* Timeframe Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setTimeframe('weekly')}
          className={`flex-1 py-2 px-4 rounded-xl font-medium transition-colors ${
            timeframe === 'weekly'
              ? 'bg-primary text-white'
              : 'bg-background-secondary text-text-muted hover:bg-background-secondary/80'
          }`}
        >
          Ukentlig
        </button>
        <button
          onClick={() => setTimeframe('monthly')}
          className={`flex-1 py-2 px-4 rounded-xl font-medium transition-colors ${
            timeframe === 'monthly'
              ? 'bg-primary text-white'
              : 'bg-background-secondary text-text-muted hover:bg-background-secondary/80'
          }`}
        >
          Månedlig
        </button>
      </div>

      {/* Comparison Cards */}
      <div>
        <h2 className="font-heading text-lg font-semibold text-text-primary mb-3">
          {timeframe === 'weekly' ? 'Denne uken vs forrige uke' : 'Denne måneden vs forrige måned'}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <ComparisonCard
            label="Økter"
            current={timeframe === 'weekly' ? thisWeekStats.workouts : thisMonthStats.workouts}
            previous={timeframe === 'weekly' ? lastWeekStats.workouts : lastMonthStats.workouts}
            icon={<Activity size={18} />}
            color="primary"
          />
          <ComparisonCard
            label="Kilometer"
            current={timeframe === 'weekly' ? thisWeekStats.km : thisMonthStats.km}
            previous={timeframe === 'weekly' ? lastWeekStats.km : lastMonthStats.km}
            icon={<TrendingUp size={18} />}
            color="running"
            suffix=" km"
          />
          <ComparisonCard
            label="Timer"
            current={timeframe === 'weekly' ? thisWeekStats.hours : thisMonthStats.hours}
            previous={timeframe === 'weekly' ? lastWeekStats.hours : lastMonthStats.hours}
            icon={<Flame size={18} />}
            color="secondary"
            suffix=" t"
          />
          <ComparisonCard
            label="Snitt RPE"
            current={timeframe === 'weekly' ? thisWeekStats.avgRPE : thisMonthStats.avgRPE}
            previous={timeframe === 'weekly' ? lastWeekStats.avgRPE : lastMonthStats.avgRPE}
            icon={<Target size={18} />}
            color="success"
            suffix="/10"
          />
        </div>
      </div>

      {/* Plan Progress (if exists) */}
      {planProgress && (
        <div className="card bg-gradient-to-br from-secondary/20 to-secondary/5 border-secondary/20">
          <h3 className="font-medium text-text-primary mb-4 flex items-center gap-2">
            <Target size={18} className="text-secondary" />
            Fremgang mot ukens mål
          </h3>
          <div className="space-y-4">
            <ProgressBar
              label="Løping"
              current={planProgress.runningCurrent}
              target={planProgress.runningTarget}
              suffix=" km"
              color="running"
            />
            <ProgressBar
              label="Styrkeøkter"
              current={planProgress.strengthCurrent}
              target={planProgress.strengthTarget}
              suffix=" økter"
              color="hyrox"
            />
          </div>
        </div>
      )}

      {/* Main Chart - Distance */}
      <div className="card">
        <h3 className="font-medium text-text-primary mb-4">
          {timeframe === 'weekly' ? 'Ukentlig løping (km)' : 'Månedlig løping (km)'}
        </h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorKm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff6b35" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ff6b35" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey={xAxisLabel}
                tick={{ fill: '#adb5bd', fontSize: 11 }}
                tickLine={{ stroke: '#333' }}
              />
              <YAxis
                tick={{ fill: '#adb5bd', fontSize: 11 }}
                tickLine={{ stroke: '#333' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a2e',
                  border: '1px solid #333',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#f8f9fa' }}
              />
              <Area
                type="monotone"
                dataKey="km"
                stroke="#ff6b35"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorKm)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Workout Count Chart */}
      <div className="card">
        <h3 className="font-medium text-text-primary mb-4">
          {timeframe === 'weekly' ? 'Antall økter per uke' : 'Antall økter per måned'}
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey={xAxisLabel}
                tick={{ fill: '#adb5bd', fontSize: 11 }}
                tickLine={{ stroke: '#333' }}
              />
              <YAxis
                tick={{ fill: '#adb5bd', fontSize: 11 }}
                tickLine={{ stroke: '#333' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a2e',
                  border: '1px solid #333',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#f8f9fa' }}
              />
              <Bar dataKey="workouts" fill="#06d6a0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Training Heatmap */}
      <div className="card">
        <h3 className="font-medium text-text-primary mb-4 flex items-center gap-2">
          <Calendar size={18} />
          Treningsaktivitet (siste 90 dager)
        </h3>
        <TrainingHeatmap data={heatmapData} />
      </div>

      {/* Quick stats overview */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card">
          <p className="stat-label">Siste 4 uker</p>
          <p className="stat-value">{stats28.totalRunningKm} km</p>
          <p className="text-xs text-text-muted mt-1">{stats28.totalWorkouts} økter</p>
        </div>
        <div className="card">
          <p className="stat-label">Siste 3 måneder</p>
          <p className="stat-value">{stats90.totalRunningKm} km</p>
          <p className="text-xs text-text-muted mt-1">{stats90.totalWorkouts} økter</p>
        </div>
      </div>

      {/* Workout breakdown by type */}
      <div className="card">
        <h3 className="font-medium text-text-primary mb-4">Økter per type (4 uker)</h3>
        <div className="space-y-2">
          {Object.entries(stats28.workoutsByType).length > 0 ? (
            Object.entries(stats28.workoutsByType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-text-secondary capitalize">{type.replace('_', ' ')}</span>
                <span className="font-medium text-text-primary">{count}</span>
              </div>
            ))
          ) : (
            <p className="text-text-muted text-sm italic">Ingen økter registrert</p>
          )}
        </div>
      </div>

      {/* Average RPE */}
      <div className="card">
        <h3 className="font-medium text-text-primary mb-2">Gjennomsnittlig RPE</h3>
        <div className="flex items-end gap-4">
          <div>
            <p className="stat-value">{stats28.avgRPE}</p>
            <p className="stat-label">Siste 4 uker</p>
          </div>
          <div className="flex-1 h-2 bg-background-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-success via-warning to-error rounded-full transition-all"
              style={{ width: `${(stats28.avgRPE / 10) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Comparison Card Component
function ComparisonCard({ label, current, previous, icon, color, suffix = '' }) {
  const difference = current - previous
  const percentChange = previous > 0 ? ((difference / previous) * 100) : 0

  const colorClasses = {
    primary: 'text-primary bg-primary/20',
    running: 'text-running bg-running/20',
    secondary: 'text-secondary bg-secondary/20',
    success: 'text-success bg-success/20',
    hyrox: 'text-hyrox bg-hyrox/20'
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-muted uppercase tracking-wide">{label}</span>
        <div className={`w-8 h-8 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <p className="font-heading font-bold text-2xl text-text-primary">
        {current}{suffix}
      </p>
      <div className="flex items-center gap-1 mt-1">
        {difference > 0 ? (
          <>
            <ArrowUp size={14} className="text-success" />
            <span className="text-xs text-success font-medium">
              +{Math.abs(difference).toFixed(1)}{suffix}
            </span>
          </>
        ) : difference < 0 ? (
          <>
            <ArrowDown size={14} className="text-error" />
            <span className="text-xs text-error font-medium">
              -{Math.abs(difference).toFixed(1)}{suffix}
            </span>
          </>
        ) : (
          <>
            <Minus size={14} className="text-text-muted" />
            <span className="text-xs text-text-muted">Uendret</span>
          </>
        )}
        {percentChange !== 0 && (
          <span className="text-xs text-text-muted ml-1">
            ({Math.abs(percentChange).toFixed(0)}%)
          </span>
        )}
      </div>
    </div>
  )
}

// Progress Bar Component
function ProgressBar({ label, current, target, suffix, color }) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0
  const isComplete = current >= target

  const colorClasses = {
    running: 'bg-running',
    hyrox: 'bg-hyrox',
    success: 'bg-success'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-text-secondary">{label}</span>
        <span className="text-sm font-medium text-text-primary">
          {current} / {target}{suffix}
        </span>
      </div>
      <div className="h-2 bg-background-secondary rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {isComplete && (
        <p className="text-xs text-success mt-1 flex items-center gap-1">
          <Target size={12} />
          Mål nådd!
        </p>
      )}
    </div>
  )
}

// Training Heatmap Component
function TrainingHeatmap({ data }) {
  // Group by weeks
  const weeks = []
  let currentWeek = []

  data.forEach((day, index) => {
    currentWeek.push(day)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  })

  if (currentWeek.length > 0) {
    weeks.push(currentWeek)
  }

  const getIntensityColor = (intensity) => {
    if (intensity === 0) return 'bg-background-secondary'
    if (intensity === 1) return 'bg-success/30'
    if (intensity === 2) return 'bg-success/60'
    return 'bg-success'
  }

  return (
    <div className="space-y-1 overflow-x-auto">
      <div className="flex gap-1 mb-2 text-xs text-text-muted">
        <span className="w-8">Man</span>
        <span className="w-8">Tir</span>
        <span className="w-8">Ons</span>
        <span className="w-8">Tor</span>
        <span className="w-8">Fre</span>
        <span className="w-8">Lør</span>
        <span className="w-8">Søn</span>
      </div>
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="flex gap-1">
          {week.map((day, dayIndex) => (
            <div
              key={dayIndex}
              className={`w-8 h-8 rounded ${getIntensityColor(day.intensity)} transition-colors cursor-pointer hover:ring-2 hover:ring-success`}
              title={`${format(day.date, 'd. MMM yyyy', { locale: nb })}: ${day.workouts} ${day.workouts === 1 ? 'økt' : 'økter'}`}
            />
          ))}
        </div>
      ))}
      <div className="flex items-center gap-2 mt-4 text-xs text-text-muted">
        <span>Mindre</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 rounded bg-background-secondary" />
          <div className="w-4 h-4 rounded bg-success/30" />
          <div className="w-4 h-4 rounded bg-success/60" />
          <div className="w-4 h-4 rounded bg-success" />
        </div>
        <span>Mer</span>
      </div>
    </div>
  )
}
