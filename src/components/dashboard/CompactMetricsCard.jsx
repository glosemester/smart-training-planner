import { motion } from 'framer-motion'
import { Activity, Heart, Zap, Moon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import GlassCard from '../ui/GlassCard'

/**
 * Apple Health-inspired compact metrics display
 * Circular progress rings with minimal text
 */

// Circular progress ring component
const ProgressRing = ({ progress, size = 80, strokeWidth = 6, color = '#B9E43C', children }) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Background circle */}
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-white/10"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}

// Compact metric item
const MetricItem = ({ icon: Icon, label, value, unit, trend, color = '#B9E43C' }) => {
  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp size={12} className="text-green-400" />
    if (trend === 'down') return <TrendingDown size={12} className="text-red-400" />
    return <Minus size={12} className="text-text-muted" />
  }

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
      <div className="flex-shrink-0 p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-muted uppercase tracking-wider">{label}</p>
        <div className="flex items-center gap-1.5">
          <p className="text-lg font-bold text-text-primary">
            {value}<span className="text-xs font-normal text-text-muted ml-0.5">{unit}</span>
          </p>
          {trend && getTrendIcon()}
        </div>
      </div>
    </div>
  )
}

export default function CompactMetricsCard({ readiness, health, weeklyLoad, whoop }) {
  // Calculate ring colors based on values
  const getReadinessColor = (score) => {
    if (score >= 67) return '#10B981' // green
    if (score >= 34) return '#F59E0B' // yellow
    return '#EF4444' // red
  }

  const getHrvTrend = () => {
    if (!health?.hrv || !health?.hrvBaseline) return null
    if (health.hrv > health.hrvBaseline + 5) return 'up'
    if (health.hrv < health.hrvBaseline - 5) return 'down'
    return 'stable'
  }

  const recentCycle = whoop?.cycles?.[0]

  return (
    <GlassCard className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          I dag
        </h3>
        <span className="text-xs text-text-muted">
          {new Date().toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' })}
        </span>
      </div>

      {/* Main readiness ring */}
      <div className="flex items-center justify-center mb-6">
        <ProgressRing
          progress={readiness || 0}
          size={120}
          strokeWidth={10}
          color={getReadinessColor(readiness)}
        >
          <div className="text-center">
            <p className="text-3xl font-bold" style={{ color: getReadinessColor(readiness) }}>
              {readiness || '-'}
            </p>
            <p className="text-[10px] text-text-muted uppercase tracking-wider">
              Readiness
            </p>
          </div>
        </ProgressRing>
      </div>

      {/* Compact metrics grid */}
      <div className="space-y-1">
        {/* HRV */}
        {health?.hrv && (
          <MetricItem
            icon={Activity}
            label="HRV"
            value={health.hrv}
            unit="ms"
            trend={getHrvTrend()}
            color="#8B5CF6"
          />
        )}

        {/* Resting HR */}
        {health?.restingHR && (
          <MetricItem
            icon={Heart}
            label="Puls"
            value={health.restingHR}
            unit="bpm"
            color="#EF4444"
          />
        )}

        {/* Sleep */}
        {health?.sleepPerformance && (
          <MetricItem
            icon={Moon}
            label="Søvn"
            value={health.sleepPerformance}
            unit="%"
            color="#6366F1"
          />
        )}

        {/* Strain */}
        {recentCycle?.score?.strain && (
          <MetricItem
            icon={Zap}
            label="Strain"
            value={recentCycle.score.strain.toFixed(1)}
            unit=""
            color="#F59E0B"
          />
        )}

        {/* Weekly load */}
        {weeklyLoad?.hours > 0 && (
          <MetricItem
            icon={Activity}
            label="Uke"
            value={weeklyLoad.hours}
            unit={`t (${weeklyLoad.count})`}
            color="#B9E43C"
          />
        )}
      </div>

      {/* Mini rings row at bottom */}
      <div className="flex items-center justify-around mt-4 pt-4 border-t border-white/5">
        {/* Sleep ring */}
        {health?.sleepPerformance && (
          <div className="text-center">
            <ProgressRing progress={health.sleepPerformance} size={50} strokeWidth={4} color="#6366F1">
              <Moon size={16} className="text-indigo-400" />
            </ProgressRing>
            <p className="text-[10px] text-text-muted mt-1">Søvn</p>
          </div>
        )}

        {/* HRV ring */}
        {health?.hrv && health?.hrvBaseline && (
          <div className="text-center">
            <ProgressRing
              progress={Math.min((health.hrv / health.hrvBaseline) * 100, 100)}
              size={50}
              strokeWidth={4}
              color="#8B5CF6"
            >
              <Activity size={16} className="text-purple-400" />
            </ProgressRing>
            <p className="text-[10px] text-text-muted mt-1">HRV</p>
          </div>
        )}

        {/* Strain ring */}
        {recentCycle?.score?.strain && (
          <div className="text-center">
            <ProgressRing
              progress={Math.min((recentCycle.score.strain / 21) * 100, 100)}
              size={50}
              strokeWidth={4}
              color="#F59E0B"
            >
              <Zap size={16} className="text-yellow-400" />
            </ProgressRing>
            <p className="text-[10px] text-text-muted mt-1">Strain</p>
          </div>
        )}
      </div>
    </GlassCard>
  )
}
