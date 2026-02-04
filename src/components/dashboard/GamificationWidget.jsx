import { motion } from 'framer-motion'
import { Trophy, Zap, TrendingUp, Award } from 'lucide-react'
import { useGamification } from '../../contexts/GamificationContext'
import { BADGES } from '../../services/gamificationService'
import { fadeInUp } from '../../utils/animations'

/**
 * GamificationWidget - Shows XP, level, streak, and badges on dashboard
 */
export default function GamificationWidget() {
  const { gamificationData, levelInfo, loading } = useGamification()

  if (loading || !gamificationData) {
    return (
      <div className="glass-card p-6 animate-shimmer">
        <div className="h-32 flex items-center justify-center">
          <p className="text-text-muted">Laster gamification...</p>
        </div>
      </div>
    )
  }

  const { badges, streaks } = gamificationData
  const earnedBadges = badges.map(badgeId => BADGES[badgeId]).filter(Boolean)

  // Get streak emoji and message
  const getStreakInfo = () => {
    const current = streaks.current
    if (current === 0) return { emoji: '💤', message: 'Start din streak!' }
    if (current < 3) return { emoji: '🔥', message: 'Hold det gående!' }
    if (current < 7) return { emoji: '🔥🔥', message: 'Flott streak!' }
    if (current < 14) return { emoji: '🔥🔥🔥', message: 'Utrolig streak!' }
    return { emoji: '🔥🔥🔥🔥', message: 'Legendarisk streak!' }
  }

  const streakInfo = getStreakInfo()

  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      className="glass-card p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <Trophy size={20} className="text-primary" />
          Din Progresjon
        </h3>
        <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
          <Zap size={14} className="text-primary" />
          <span className="text-sm font-bold text-primary">{gamificationData.xp} XP</span>
        </div>
      </div>

      {/* Level Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary via-lime-400 to-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-bold text-sm">{levelInfo.level}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Nivå {levelInfo.level}</p>
              <p className="text-xs text-text-muted">
                {Math.floor(levelInfo.progress)}% til nivå {levelInfo.level + 1}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted">Neste nivå</p>
            <p className="text-sm font-semibold text-text-primary">{levelInfo.nextLevelXP} XP</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${levelInfo.progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-primary via-lime-400 to-primary rounded-full shadow-lg shadow-primary/30"
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Streak */}
        <div className="bg-black/20 backdrop-blur-sm border border-white/5 p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{streakInfo.emoji}</span>
            <div>
              <p className="text-xs text-text-muted uppercase tracking-widest">Streak</p>
              <p className="text-xl font-bold text-text-primary">{streaks.current}</p>
            </div>
          </div>
          <p className="text-xs text-text-secondary mt-2">{streakInfo.message}</p>
          {streaks.longest > streaks.current && (
            <p className="text-xs text-text-muted mt-1">Rekord: {streaks.longest} dager</p>
          )}
        </div>

        {/* Badges */}
        <div className="bg-black/20 backdrop-blur-sm border border-white/5 p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Award size={20} className="text-primary" />
            <div>
              <p className="text-xs text-text-muted uppercase tracking-widest">Badges</p>
              <p className="text-xl font-bold text-text-primary">{earnedBadges.length}</p>
            </div>
          </div>
          <p className="text-xs text-text-secondary mt-2">
            {earnedBadges.length === 0
              ? 'Fullfør økter for å låse opp badges!'
              : `${earnedBadges.length} av ${Object.keys(BADGES).length} låst opp`}
          </p>
        </div>
      </div>

      {/* Recent Badges */}
      {earnedBadges.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-text-muted uppercase tracking-widest">Siste Badges</p>
          <div className="flex flex-wrap gap-2">
            {earnedBadges.slice(-5).reverse().map((badge) => (
              <div
                key={badge.id}
                className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-2 rounded-lg"
                title={badge.description}
              >
                <span className="text-xl">{badge.icon}</span>
                <span className="text-xs font-semibold text-primary">{badge.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="border-t border-white/5 pt-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-text-primary">{gamificationData.stats.totalWorkouts}</p>
            <p className="text-xs text-text-muted">Økter</p>
          </div>
          <div>
            <p className="text-lg font-bold text-text-primary">{Math.round(gamificationData.stats.totalDistance)}</p>
            <p className="text-xs text-text-muted">km</p>
          </div>
          <div>
            <p className="text-lg font-bold text-text-primary">
              {Math.round(gamificationData.stats.totalDuration / 60)}
            </p>
            <p className="text-xs text-text-muted">timer</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
