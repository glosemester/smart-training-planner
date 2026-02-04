import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { useAuth } from '../../hooks/useAuth'
import GlassCard from '../ui/GlassCard'
import Button from '../ui/Button'
import {
  Trophy,
  AlertTriangle,
  TrendingUp,
  Activity,
  Heart,
  Zap,
  Shield,
  ChevronRight,
  Loader2,
  Info
} from 'lucide-react'
import { fadeInUp, staggerContainer, staggerItem } from '../../utils/animations'

/**
 * Performance Dashboard - Enhanced Analytics Visualization
 * Integrates Fase 1-3: Performance Analytics, Recovery Patterns, ML Predictions
 */
export default function PerformanceDashboard() {
  const { user, userProfile } = useAuth()
  const functions = getFunctions()

  const [loading, setLoading] = useState(true)
  const [predictions, setPredictions] = useState(null)
  const [injuryRisk, setInjuryRisk] = useState(null)
  const [athleteInsights, setAthleteInsights] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (user?.uid && userProfile?.raceDate && userProfile?.raceDistance) {
      loadPerformanceData()
    } else {
      setLoading(false)
    }
  }, [user?.uid, userProfile?.raceDate, userProfile?.raceDistance])

  const loadPerformanceData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Get race predictions
      const predictRacePerformance = httpsCallable(functions, 'predictRacePerformance')
      const predictionsResult = await predictRacePerformance({
        userId: user.uid,
        raceDate: userProfile.raceDate,
        raceDistance: userProfile.raceDistance
      })

      setPredictions(predictionsResult.data)

      // Get injury risk assessment
      const assessInjuryRisk = httpsCallable(functions, 'assessInjuryRisk')
      const riskResult = await assessInjuryRisk({ userId: user.uid })
      setInjuryRisk(riskResult.data)

      // Get comprehensive athlete insights
      const getAthleteInsights = httpsCallable(functions, 'getAthleteInsights')
      const insightsResult = await getAthleteInsights({ userId: user.uid })
      setAthleteInsights(insightsResult.data)

    } catch (err) {
      console.error('Failed to load performance data:', err)
      setError(err.message || 'Kunne ikke laste analytics data')
    } finally {
      setLoading(false)
    }
  }

  // Format time (seconds to HH:MM:SS)
  const formatTime = (seconds) => {
    if (!seconds) return '—'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // Loading state
  if (loading) {
    return (
      <GlassCard className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 animate-spin text-primary" size={32} />
          <p className="text-text-secondary text-sm">Analyserer ytelsesdata...</p>
        </div>
      </GlassCard>
    )
  }

  // No race configured
  if (!userProfile?.raceDate || !userProfile?.raceDistance) {
    return (
      <GlassCard className="border-dashed border-2 border-white/5 bg-transparent">
        <div className="text-center py-8">
          <Info className="mx-auto mb-3 text-text-muted opacity-50" size={32} />
          <p className="text-text-secondary font-medium mb-2">Ingen race konfigurert</p>
          <p className="text-text-muted text-sm mb-4">Sett opp en race for å se prediksjoner</p>
          <Button size="sm" variant="outline" onClick={() => window.location.href = '/plan'}>
            Lag treningsplan
          </Button>
        </div>
      </GlassCard>
    )
  }

  // Error state
  if (error) {
    return (
      <GlassCard className="border-error/20 bg-error/5">
        <div className="text-center py-8">
          <AlertTriangle className="mx-auto mb-3 text-error" size={32} />
          <p className="text-text-primary font-medium mb-2">Kunne ikke laste analytics</p>
          <p className="text-text-muted text-sm mb-4">{error}</p>
          <Button size="sm" onClick={loadPerformanceData}>Prøv igjen</Button>
        </div>
      </GlassCard>
    )
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      {/* Race Prediction Card */}
      {predictions && (
        <motion.div variants={staggerItem}>
          <GlassCard className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent relative overflow-hidden">
            {/* Decorative glow */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                    <Trophy className="text-primary" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">Race Prediksjon</h3>
                    <p className="text-xs text-text-muted">
                      {userProfile.raceDistance}km • {new Date(userProfile.raceDate).toLocaleDateString('nb-NO')}
                    </p>
                  </div>
                </div>

                {predictions.confidence && (
                  <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
                    <p className="text-xs font-medium text-text-secondary">
                      {Math.round(predictions.confidence * 100)}% sikkerhet
                    </p>
                  </div>
                )}
              </div>

              {/* Predicted time - Hero */}
              <div className="text-center mb-6">
                <div className="inline-block px-6 py-4 rounded-2xl bg-white/5 border border-primary/20 backdrop-blur-sm">
                  <p className="text-sm text-text-muted mb-1 uppercase tracking-wider font-medium">Predikert tid</p>
                  <p className="text-5xl font-bold text-primary tracking-tight">
                    {formatTime(predictions.predictedTime)}
                  </p>
                  {predictions.predictedVDOT && (
                    <p className="text-xs text-text-muted mt-2">VDOT: {predictions.predictedVDOT.toFixed(1)}</p>
                  )}
                </div>
              </div>

              {/* Confidence Interval */}
              {predictions.confidenceInterval && (
                <div className="space-y-2">
                  <p className="text-xs text-text-muted uppercase tracking-wider font-medium">Forventet tidsintervall</p>
                  <div className="flex items-center justify-between gap-4 px-4 py-3 bg-black/20 rounded-lg border border-white/5">
                    <div className="text-center flex-1">
                      <p className="text-xs text-text-muted mb-1">Best case</p>
                      <p className="text-lg font-bold text-green-400">{formatTime(predictions.confidenceInterval.min)}</p>
                    </div>
                    <ChevronRight size={16} className="text-text-muted" />
                    <div className="text-center flex-1">
                      <p className="text-xs text-text-muted mb-1">Worst case</p>
                      <p className="text-lg font-bold text-orange-400">{formatTime(predictions.confidenceInterval.max)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Pace Recommendation */}
              {predictions.paceRecommendation && (
                <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-sm text-text-secondary">
                    <span className="font-semibold text-primary">Anbefalt pace:</span> {predictions.paceRecommendation}
                  </p>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Injury Risk Card */}
      {injuryRisk && (
        <motion.div variants={staggerItem}>
          <GlassCard className={`border-l-4 ${
            injuryRisk.riskLevel === 'HIGH' ? 'border-error bg-error/5' :
            injuryRisk.riskLevel === 'MODERATE' ? 'border-warning bg-warning/5' :
            'border-success bg-success/5'
          }`}>
            <div className="flex items-start gap-4">
              {/* Risk Score Circle */}
              <div className={`relative flex-shrink-0 w-20 h-20 rounded-full flex items-center justify-center border-4 ${
                injuryRisk.riskLevel === 'HIGH' ? 'border-error/40 bg-error/10' :
                injuryRisk.riskLevel === 'MODERATE' ? 'border-warning/40 bg-warning/10' :
                'border-success/40 bg-success/10'
              }`}>
                <div className="text-center">
                  <p className="text-2xl font-bold text-text-primary">{injuryRisk.riskScore}</p>
                  <p className="text-[10px] text-text-muted">/ 100</p>
                </div>
              </div>

              {/* Risk Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={18} className={
                    injuryRisk.riskLevel === 'HIGH' ? 'text-error' :
                    injuryRisk.riskLevel === 'MODERATE' ? 'text-warning' :
                    'text-success'
                  } />
                  <h3 className="text-lg font-bold text-text-primary">Skaderisiko</h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    injuryRisk.riskLevel === 'HIGH' ? 'bg-error/20 text-error' :
                    injuryRisk.riskLevel === 'MODERATE' ? 'bg-warning/20 text-warning' :
                    'bg-success/20 text-success'
                  }`}>
                    {injuryRisk.riskLevel === 'HIGH' ? 'HØY' :
                     injuryRisk.riskLevel === 'MODERATE' ? 'MODERAT' : 'LAV'}
                  </span>
                </div>

                {/* Risk Factors */}
                {injuryRisk.riskFactors && injuryRisk.riskFactors.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {injuryRisk.riskFactors.map((factor, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <AlertTriangle size={14} className="text-text-muted mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-text-secondary">{factor.description || factor}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recommendation */}
                {injuryRisk.recommendation && (
                  <div className="p-3 bg-black/20 rounded-lg border border-white/5">
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {injuryRisk.recommendation}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Athlete Insights Grid */}
      {athleteInsights && (
        <motion.div variants={staggerItem}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Fitness */}
            {athleteInsights.fitness && (
              <GlassCard className="border-primary/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <TrendingUp className="text-primary" size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-text-primary mb-1">Form</h4>
                    <p className="text-2xl font-bold text-primary mb-1">
                      {athleteInsights.fitness.currentVDOT}
                    </p>
                    <p className="text-xs text-text-muted">VDOT • {athleteInsights.fitness.experienceLevel}</p>
                  </div>
                </div>
              </GlassCard>
            )}

            {/* Recovery */}
            {athleteInsights.recovery && (
              <GlassCard className="border-accent/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Heart className="text-accent" size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-text-primary mb-1">Restitusjon</h4>
                    <p className="text-lg font-bold text-accent capitalize mb-1">
                      {athleteInsights.recovery.speed || 'Average'}
                    </p>
                    <p className="text-xs text-text-muted">
                      {athleteInsights.recovery.confidence} sikkerhet
                    </p>
                  </div>
                </div>
              </GlassCard>
            )}

            {/* Load Status */}
            {athleteInsights.load && (
              <GlassCard className="border-blue-400/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-400/10">
                    <Activity className="text-blue-400" size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-text-primary mb-1">Treningsbelastning</h4>
                    <p className="text-lg font-bold text-blue-400 capitalize mb-1">
                      {athleteInsights.load.status}
                    </p>
                    {athleteInsights.load.tsb && (
                      <p className="text-xs text-text-muted">
                        TSB: {athleteInsights.load.tsb.tsb?.toFixed(0)} • Ratio: {athleteInsights.load.tsb.ratio?.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              </GlassCard>
            )}

            {/* Adherence */}
            {athleteInsights.adherence && (
              <GlassCard className="border-green-400/20">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-green-400/10">
                    <Zap className="text-green-400" size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-text-primary mb-1">Etterlevelse</h4>
                    <p className="text-2xl font-bold text-green-400 mb-1">
                      {Math.round(athleteInsights.adherence.overallRate * 100)}%
                    </p>
                    <p className="text-xs text-text-muted">Gjennomføringsgrad</p>
                  </div>
                </div>
              </GlassCard>
            )}
          </div>
        </motion.div>
      )}

      {/* Refresh Button */}
      <motion.div variants={staggerItem} className="flex justify-center">
        <Button
          size="sm"
          variant="outline"
          onClick={loadPerformanceData}
          className="gap-2"
        >
          <Activity size={16} />
          Oppdater analytics
        </Button>
      </motion.div>
    </motion.div>
  )
}
