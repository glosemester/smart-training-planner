import { useMemo } from 'react'
import { useWorkouts } from '../../hooks/useWorkouts'
import { BarChart3, TrendingUp, Calendar, Target } from 'lucide-react'
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts'
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns'
import { nb } from 'date-fns/locale'

export default function Statistics() {
  const { workouts, getStats } = useWorkouts()

  // Ukentlig km data for graf
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
      weekWorkouts.forEach(w => {
        if (w.running?.distance) km += w.running.distance
        hours += (w.duration || 0) / 60
      })

      weeks.push({
        week: format(weekStart, 'w', { locale: nb }),
        km: Math.round(km * 10) / 10,
        hours: Math.round(hours * 10) / 10,
        workouts: weekWorkouts.length
      })
    }
    return weeks
  }, [workouts])

  const stats28 = useMemo(() => getStats(28), [getStats])
  const stats90 = useMemo(() => getStats(90), [getStats])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary flex items-center gap-2">
          <BarChart3 className="text-primary" />
          Statistikk
        </h1>
      </div>

      {/* Quick stats */}
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

      {/* Weekly km chart */}
      <div className="card">
        <h3 className="font-medium text-text-primary mb-4">Ukentlig løping (km)</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                dataKey="week" 
                tick={{ fill: '#adb5bd', fontSize: 10 }}
                tickLine={{ stroke: '#333' }}
              />
              <YAxis 
                tick={{ fill: '#adb5bd', fontSize: 10 }}
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
              <Bar dataKey="km" fill="#ff6b35" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Workout breakdown */}
      <div className="card">
        <h3 className="font-medium text-text-primary mb-4">Økter per type (4 uker)</h3>
        <div className="space-y-2">
          {Object.entries(stats28.workoutsByType).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between">
              <span className="text-text-secondary capitalize">{type.replace('_', ' ')}</span>
              <span className="font-medium text-text-primary">{count}</span>
            </div>
          ))}
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
