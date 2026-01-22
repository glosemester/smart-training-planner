import { useMemo } from 'react'
import { useWorkouts } from '../../hooks/useWorkouts'
import {
  calculateOverallAdherence,
  calculateConsistency,
  calculateVolumeAdherence,
  calculateSessionTypeDistribution,
  findWeakAreas,
  calculateTrend
} from '../../utils/planAdherence'
import { getWorkoutType } from '../../data/workoutTypes'
import { TrendingUp, TrendingDown, Minus, Target, Calendar, Activity, AlertCircle } from 'lucide-react'

export default function PlanAdherenceDashboard() {
  const { plans, workouts } = useWorkouts()

  // Beregn alle metrics
  const metrics = useMemo(() => {
    if (!plans || plans.length === 0) {
      return null
    }

    return {
      overall: calculateOverallAdherence(plans),
      consistency: calculateConsistency(plans, workouts),
      volume: calculateVolumeAdherence(plans, workouts),
      distribution: calculateSessionTypeDistribution(plans),
      trend: calculateTrend(plans)
    }
  }, [plans, workouts])

  const weakAreas = useMemo(() => {
    if (!metrics?.distribution) return []
    return findWeakAreas(metrics.distribution)
  }, [metrics])

  if (!metrics) {
    return (
      <div className="card text-center py-12">
        <Calendar size={48} className="mx-auto text-text-muted mb-4" />
        <p className="text-text-muted">
          Generer en treningsplan for å se oppfølgingsstatistikk
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-heading text-2xl font-bold text-text-primary flex items-center gap-2">
          <Target size={28} className="text-primary" />
          Planoppfølging
        </h2>
        <p className="text-text-muted mt-1">
          Se hvordan du gjennomfører planen din
        </p>
      </div>

      {/* Main metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Overall adherence */}
        <div className="card bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-text-primary">Total gjennomføring</h3>
            <Target size={20} className="text-primary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-primary">
              {metrics.overall.percentage}%
            </span>
          </div>
          <p className="text-sm text-text-muted mt-2">
            {metrics.overall.totalCompleted} av {metrics.overall.totalPlanned} økter fullført
          </p>
          <div className="mt-3 bg-background-tertiary rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-500"
              style={{ width: `${metrics.overall.percentage}%` }}
            />
          </div>
        </div>

        {/* Consistency */}
        <div className="card bg-gradient-to-br from-secondary/20 to-secondary/5 border-secondary/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-text-primary">Konsistens</h3>
            <Calendar size={20} className="text-secondary" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-secondary">
              {metrics.consistency.score}%
            </span>
          </div>
          <p className="text-sm text-text-muted mt-2">
            {metrics.consistency.weeksWithWorkouts} av {metrics.consistency.totalWeeks} uker med trening
          </p>
          <p className="text-xs text-text-secondary mt-2">
            {metrics.consistency.message}
          </p>
        </div>

        {/* Volume adherence */}
        <div className="card bg-gradient-to-br from-hyrox/20 to-hyrox/5 border-hyrox/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-text-primary">Volumoppfølging</h3>
            <Activity size={20} className="text-hyrox" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-hyrox">
              {metrics.volume.percentage}%
            </span>
          </div>
          <p className="text-sm text-text-muted mt-2">
            {metrics.volume.completedKm} av {metrics.volume.plannedKm} km løpt
          </p>
          <p className="text-xs text-text-secondary mt-2">
            {metrics.volume.message}
          </p>
        </div>
      </div>

      {/* Trend */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-text-primary">Trend over tid</h3>
          {metrics.trend.direction === 'improving' && <TrendingUp className="text-success" />}
          {metrics.trend.direction === 'declining' && <TrendingDown className="text-error" />}
          {metrics.trend.direction === 'stable' && <Minus className="text-text-muted" />}
        </div>

        <p className={`text-lg font-medium ${
          metrics.trend.direction === 'improving' ? 'text-success' :
          metrics.trend.direction === 'declining' ? 'text-error' :
          'text-text-secondary'
        }`}>
          {metrics.trend.message}
        </p>

        {metrics.trend.direction !== 'insufficient_data' && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-background-secondary rounded-lg p-3">
              <p className="text-xs text-text-muted">Tidligere perioder</p>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {metrics.trend.firstHalfAdherence}%
              </p>
            </div>
            <div className="bg-background-secondary rounded-lg p-3">
              <p className="text-xs text-text-muted">Nylige perioder</p>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {metrics.trend.secondHalfAdherence}%
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Session type distribution */}
      <div className="card">
        <h3 className="font-medium text-text-primary mb-4">Gjennomføring per økttype</h3>
        <div className="space-y-3">
          {metrics.distribution.map((item, idx) => {
            const workoutType = getWorkoutType(item.type)
            const isWeak = item.percentage < 70

            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{workoutType.icon}</span>
                    <span className="text-text-primary">{workoutType.name}</span>
                  </div>
                  <span className={`font-medium ${
                    isWeak ? 'text-warning' : 'text-text-secondary'
                  }`}>
                    {item.completed}/{item.planned} ({item.percentage}%)
                  </span>
                </div>
                <div className="bg-background-tertiary rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      item.percentage >= 80 ? 'bg-success' :
                      item.percentage >= 60 ? 'bg-primary' :
                      item.percentage >= 40 ? 'bg-warning' :
                      'bg-error'
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Weak areas - areas for improvement */}
      {weakAreas.length > 0 && (
        <div className="card bg-warning/5 border-warning/20">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle size={20} className="text-warning" />
            <h3 className="font-medium text-text-primary">Forbedringsområder</h3>
          </div>
          <ul className="space-y-2">
            {weakAreas.map((area, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-text-secondary">
                <span className="text-warning mt-0.5">•</span>
                <span>{area.message}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-text-muted mt-4">
            💡 Fokuser på disse økt-typene for å forbedre planoppfølgingen din
          </p>
        </div>
      )}

      {/* Success message */}
      {metrics.overall.percentage >= 80 && weakAreas.length === 0 && (
        <div className="card bg-success/10 border-success/20">
          <div className="flex items-center gap-3">
            <div className="text-4xl">🎉</div>
            <div>
              <h3 className="font-medium text-success">Utmerket planoppfølging!</h3>
              <p className="text-sm text-text-secondary mt-1">
                Du følger planen din godt og holder deg konsekvent. Fortsett sånn!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
