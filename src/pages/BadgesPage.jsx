import { motion } from 'framer-motion'
import { Award, Lock, CheckCircle } from 'lucide-react'
import { useGamification } from '../contexts/GamificationContext'
import { BADGES } from '../services/gamificationService'
import { fadeInUp, staggerContainer, staggerItem } from '../utils/animations'

/**
 * BadgesPage - Display all badges and achievements
 */
export default function BadgesPage() {
  const { gamificationData, loading } = useGamification()

  if (loading || !gamificationData) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <div className="glass-card p-8 text-center">
          <p className="text-text-muted">Laster badges...</p>
        </div>
      </div>
    )
  }

  const earnedBadgeIds = gamificationData.badges
  const allBadges = Object.values(BADGES)

  // Group badges by category
  const categories = {
    'Første Milepæler': ['first_run', 'first_week'],
    'Distanse': ['10km_club', '50km_club', '100km_club', '500km_club', '1000km_club'],
    'Antall Økter': ['10_workouts', '50_workouts', '100_workouts'],
    'Streaks': ['week_warrior', 'month_master'],
    'Spesielle': ['marathon', 'early_bird', 'night_owl', 'iron_will']
  }

  const isEarned = (badgeId) => earnedBadgeIds.includes(badgeId)

  // Calculate progress for specific badges
  const getProgress = (badgeId) => {
    const stats = gamificationData.stats
    const streaks = gamificationData.streaks

    const progressMap = {
      // Distance
      '10km_club': Math.min((stats.totalDistance / 10) * 100, 100),
      '50km_club': Math.min((stats.totalDistance / 50) * 100, 100),
      '100km_club': Math.min((stats.totalDistance / 100) * 100, 100),
      '500km_club': Math.min((stats.totalDistance / 500) * 100, 100),
      '1000km_club': Math.min((stats.totalDistance / 1000) * 100, 100),

      // Workout count
      '10_workouts': Math.min((stats.totalWorkouts / 10) * 100, 100),
      '50_workouts': Math.min((stats.totalWorkouts / 50) * 100, 100),
      '100_workouts': Math.min((stats.totalWorkouts / 100) * 100, 100),

      // Streaks
      'week_warrior': Math.min((streaks.current / 7) * 100, 100),
      'month_master': Math.min((streaks.current / 30) * 100, 100),
      'first_week': Math.min((streaks.longest / 7) * 100, 100),

      // Special
      'early_bird': Math.min(((stats.earlyWorkouts || 0) / 10) * 100, 100),
      'night_owl': Math.min(((stats.lateWorkouts || 0) / 10) * 100, 100),
      'iron_will': Math.min(((stats.braveWorkouts || 0) / 10) * 100, 100)
    }

    return progressMap[badgeId] || 0
  }

  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <Award size={32} className="text-primary" />
          <h1 className="text-3xl font-bold text-text-primary">Badges & Prestasjoner</h1>
        </div>
        <p className="text-text-secondary">
          {earnedBadgeIds.length} av {allBadges.length} badges låst opp
        </p>
        <div className="h-2 max-w-md mx-auto bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(earnedBadgeIds.length / allBadges.length) * 100}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-primary via-lime-400 to-primary rounded-full"
          />
        </div>
      </div>

      {/* Badges by Category */}
      {Object.entries(categories).map(([categoryName, badgeIds]) => (
        <motion.div
          key={categoryName}
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-4"
        >
          <h2 className="text-xl font-bold text-text-primary">{categoryName}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {badgeIds.map((badgeId) => {
              const badge = BADGES[badgeId]
              if (!badge) return null

              const earned = isEarned(badgeId)
              const progress = getProgress(badgeId)

              return (
                <motion.div
                  key={badgeId}
                  variants={staggerItem}
                  className={`glass-card p-6 space-y-3 transition-all duration-300 ${
                    earned
                      ? 'border-primary/30 bg-primary/5'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {/* Badge Header */}
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${
                        earned
                          ? 'bg-primary/20 border-2 border-primary/30'
                          : 'bg-white/5 border-2 border-white/10 grayscale'
                      }`}
                    >
                      {earned ? (
                        badge.icon
                      ) : (
                        <Lock size={24} className="text-text-muted" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-text-primary">{badge.name}</h3>
                        {earned && <CheckCircle size={18} className="text-primary" />}
                      </div>
                      <p className="text-sm text-text-secondary mt-1">{badge.description}</p>
                    </div>
                  </div>

                  {/* Progress Bar (only for unlocked badges) */}
                  {!earned && progress > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-muted">Progresjon</span>
                        <span className="text-primary font-semibold">{Math.round(progress)}%</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.6 }}
                          className="h-full bg-gradient-to-r from-primary to-lime-400 rounded-full"
                        />
                      </div>
                    </div>
                  )}

                  {/* Earned Status */}
                  {earned && (
                    <div className="flex items-center gap-2 text-xs text-primary">
                      <CheckCircle size={14} />
                      <span className="font-semibold">Låst opp!</span>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}
