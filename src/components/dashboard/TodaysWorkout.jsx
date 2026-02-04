import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock,
  MapPin,
  Activity,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Zap,
  Heart
} from 'lucide-react'
import { useMetrics } from '../../contexts/MetricsContext'
import { useTraining } from '../../contexts/TrainingContext'
import GlassCard from '../ui/GlassCard'
import Button from '../ui/Button'
import { CardSkeleton } from '../ui/Skeleton'

/**
 * TodaysWorkout - Intelligent workout widget with Whoop-based adaptation
 * Shows today's planned workout with AI-powered adjustment recommendations
 */
export default function TodaysWorkout({ workout }) {
  const { readiness, health, whoop } = useMetrics()
  const { updatePlanSession, currentPlan } = useTraining()
  const [isAnalyzing, setIsAnalyzing] = useState(true)
  const [adjustment, setAdjustment] = useState(null)
  const [userChoice, setUserChoice] = useState(null) // 'original' | 'adjusted' | null

  // Analyze workout and generate adjustment recommendation
  const analysis = useMemo(() => {
    if (!workout || !readiness) return null

    // Recovery thresholds
    const THRESHOLDS = {
      CRITICAL: 33,
      WARNING: 50,
      OPTIMAL: 67,
      PRIME: 85
    }

    let status = 'good'
    let adjustmentFactor = 1.0
    let recommendation = ''
    let shouldAdjust = false

    // Determine recovery status
    if (readiness < THRESHOLDS.CRITICAL) {
      status = 'critical'
      adjustmentFactor = 0.3
      recommendation = 'Din kropp trenger hvile. Anbefaler total hviledag eller lett mobilitet.'
      shouldAdjust = true
    } else if (readiness < THRESHOLDS.WARNING) {
      status = 'warning'
      adjustmentFactor = 0.6
      recommendation = 'Redusert restitusjon. Kjør lettere enn planlagt i dag.'
      shouldAdjust = true
    } else if (readiness < THRESHOLDS.OPTIMAL) {
      status = 'moderate'
      adjustmentFactor = 0.85
      recommendation = 'OK restitusjon. Følg planen, men lytt til kroppen.'
      shouldAdjust = false
    } else if (readiness >= THRESHOLDS.PRIME) {
      status = 'prime'
      adjustmentFactor = 1.0
      recommendation = 'Topp restitusjon! Dette er dagen for å pushe!'
      shouldAdjust = false
    } else {
      status = 'good'
      adjustmentFactor = 1.0
      recommendation = 'God restitusjon. Kjør som planlagt.'
      shouldAdjust = false
    }

    // Adjust based on sleep performance if available
    if (health?.sleepPerformance && health.sleepPerformance < 60) {
      adjustmentFactor *= 0.85
      recommendation += ' Dårlig søvn - vær ekstra forsiktig.'
      shouldAdjust = true
    }

    // Generate adjusted workout
    let adjustedWorkout = null
    if (shouldAdjust && workout.type !== 'rest') {
      if (status === 'critical') {
        // Convert to rest day
        adjustedWorkout = {
          type: 'rest',
          title: 'Hviledag (Whoop-anbefalt)',
          description: 'Din Whoop viser kritisk lav restitusjon. I dag er hvile den beste treningen.',
          duration_minutes: 0,
          reason: 'Kritisk lav recovery score'
        }
      } else {
        // Reduce intensity
        adjustedWorkout = {
          ...workout,
          duration_minutes: Math.round(workout.duration_minutes * adjustmentFactor),
          title: `[Justert] ${workout.title}`,
          description: workout.description,
          details: workout.details ? {
            ...workout.details,
            distance_km: workout.details.distance_km
              ? Math.round(workout.details.distance_km * adjustmentFactor * 10) / 10
              : undefined
          } : undefined,
          reason: recommendation
        }
      }
    }

    return {
      status,
      readiness,
      adjustmentFactor,
      recommendation,
      shouldAdjust,
      adjustedWorkout,
      metrics: {
        recovery: readiness,
        sleep: health?.sleepPerformance,
        hrv: health?.hrv,
        restingHR: health?.restingHR
      }
    }
  }, [workout, readiness, health])

  useEffect(() => {
    // Simulate analysis delay for UX
    const timer = setTimeout(() => {
      setIsAnalyzing(false)
      if (analysis?.shouldAdjust) {
        setAdjustment(analysis.adjustedWorkout)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [analysis])

  const handleAcceptAdjustment = async () => {
    if (!adjustment || !currentPlan || !workout.id) return

    try {
      // Update the plan session with adjusted values
      await updatePlanSession(currentPlan.id, workout.id, {
        duration_minutes: adjustment.duration_minutes,
        title: adjustment.title,
        description: adjustment.description,
        details: adjustment.details,
        adjusted_by_whoop: true,
        adjustment_reason: adjustment.reason
      })

      setUserChoice('adjusted')
    } catch (error) {
      console.error('Failed to accept adjustment:', error)
    }
  }

  const handleKeepOriginal = () => {
    setUserChoice('original')
    setAdjustment(null)
  }

  if (!workout) return null

  const statusColors = {
    critical: 'border-error/50 bg-error/5',
    warning: 'border-warning/50 bg-warning/5',
    moderate: 'border-primary/50 bg-primary/5',
    good: 'border-success/50 bg-success/5',
    prime: 'border-success/50 bg-success/10'
  }

  const statusIcons = {
    critical: <AlertTriangle className="text-error" size={20} />,
    warning: <AlertTriangle className="text-warning" size={20} />,
    moderate: <Activity className="text-primary" size={20} />,
    good: <CheckCircle className="text-success" size={20} />,
    prime: <Zap className="text-success" size={20} />
  }

  return (
    <section>
      <div className="flex items-center justify-between px-1 mb-3">
        <h2 className="text-lg font-semibold text-text-primary">I dag</h2>
        <Link
          to="/plan"
          className="text-xs text-primary hover:text-primary-light font-medium uppercase tracking-wider"
        >
          Åpne plan
        </Link>
      </div>

      {isAnalyzing && whoop ? (
        <CardSkeleton />
      ) : (
        <div className="space-y-3">
          {/* Original Workout Card */}
          <GlassCard
            className={`relative overflow-hidden transition-all duration-300 ${
              adjustment && userChoice !== 'original'
                ? 'opacity-60 scale-95'
                : 'border-primary/20 bg-background-surface/60'
            }`}
            hoverEffect={!adjustment}
          >
            {/* Highlight gradient */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-accent opacity-80" />

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-4">
                <div className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/20 backdrop-blur-md">
                  Planlagt
                </div>

                {!adjustment && (
                  <Link
                    to="/plan"
                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-primary/20 transition-colors"
                  >
                    <ArrowRight size={18} className="text-text-muted hover:text-primary" />
                  </Link>
                )}
              </div>

              <h3 className="text-xl font-bold mb-2 text-text-primary">{workout.title}</h3>
              <p className="text-text-secondary text-sm mb-5 line-clamp-2">{workout.description}</p>

              <div className="flex gap-3 flex-wrap">
                {workout.duration_minutes > 0 && (
                  <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                    <Clock size={14} className="text-text-muted" />
                    <span className="font-medium text-sm text-text-primary">
                      {workout.duration_minutes} min
                    </span>
                  </div>
                )}

                {workout.details?.distance_km && (
                  <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                    <MapPin size={14} className="text-text-muted" />
                    <span className="font-medium text-sm text-text-primary">
                      {workout.details.distance_km} km
                    </span>
                  </div>
                )}

                {workout.details?.pace_zone && (
                  <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                    <Activity size={14} className="text-text-muted" />
                    <span className="font-medium text-sm text-text-primary">
                      {workout.details.pace_zone}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Whoop Analysis & Adjustment */}
          <AnimatePresence>
            {analysis && whoop && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Whoop Metrics Bar */}
                <GlassCard
                  className={`${statusColors[analysis.status]} border`}
                  hoverEffect={false}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Heart size={16} className="text-primary" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-text-primary">
                        Whoop Analyse
                      </span>
                    </div>
                    {statusIcons[analysis.status]}
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-text-muted mb-1">Recovery</p>
                      <p className="text-lg font-bold text-text-primary">{analysis.readiness}%</p>
                    </div>
                    {analysis.metrics.sleep && (
                      <div>
                        <p className="text-xs text-text-muted mb-1">Søvn</p>
                        <p className="text-lg font-bold text-text-primary">
                          {analysis.metrics.sleep}%
                        </p>
                      </div>
                    )}
                    {analysis.metrics.hrv && (
                      <div>
                        <p className="text-xs text-text-muted mb-1">HRV</p>
                        <p className="text-lg font-bold text-text-primary">
                          {analysis.metrics.hrv}
                        </p>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-text-secondary">{analysis.recommendation}</p>
                </GlassCard>

                {/* Adjusted Workout (if recommended) */}
                {adjustment && userChoice !== 'original' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <GlassCard
                      className={`relative overflow-hidden border-2 ${
                        userChoice === 'adjusted' ? 'border-success/50' : 'border-warning/50'
                      } bg-background-surface/80`}
                      hoverEffect={false}
                    >
                      {/* Highlight gradient */}
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-warning to-error opacity-80" />

                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                          <div className="px-3 py-1 rounded-full text-xs font-semibold bg-warning/20 text-warning border border-warning/20 backdrop-blur-md">
                            Whoop-anbefalt
                          </div>
                        </div>

                        <h3 className="text-xl font-bold mb-2 text-text-primary">
                          {adjustment.title}
                        </h3>
                        <p className="text-text-secondary text-sm mb-5">{adjustment.description}</p>

                        <div className="flex gap-3 flex-wrap mb-4">
                          {adjustment.duration_minutes > 0 && (
                            <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                              <Clock size={14} className="text-text-muted" />
                              <span className="font-medium text-sm text-text-primary">
                                {adjustment.duration_minutes} min
                              </span>
                            </div>
                          )}

                          {adjustment.details?.distance_km && (
                            <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                              <MapPin size={14} className="text-text-muted" />
                              <span className="font-medium text-sm text-text-primary">
                                {adjustment.details.distance_km} km
                              </span>
                            </div>
                          )}
                        </div>

                        {userChoice === null && (
                          <div className="flex gap-3">
                            <Button
                              onClick={handleKeepOriginal}
                              variant="ghost"
                              size="sm"
                              className="flex-1"
                            >
                              Behold original
                            </Button>
                            <Button
                              onClick={handleAcceptAdjustment}
                              variant="primary"
                              size="sm"
                              className="flex-1"
                            >
                              Godta justering
                            </Button>
                          </div>
                        )}

                        {userChoice === 'adjusted' && (
                          <div className="flex items-center gap-2 text-success text-sm">
                            <CheckCircle size={16} />
                            <span>Justert økt aktivert</span>
                          </div>
                        )}
                      </div>
                    </GlassCard>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </section>
  )
}
