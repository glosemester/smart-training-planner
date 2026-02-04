import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'

/**
 * GamificationService - Manages XP, levels, badges, and streaks
 */

// Level progression (exponential growth)
const LEVELS = [
  { level: 1, xpRequired: 0 },
  { level: 2, xpRequired: 100 },
  { level: 3, xpRequired: 250 },
  { level: 4, xpRequired: 500 },
  { level: 5, xpRequired: 900 },
  { level: 6, xpRequired: 1500 },
  { level: 7, xpRequired: 2300 },
  { level: 8, xpRequired: 3300 },
  { level: 9, xpRequired: 4600 },
  { level: 10, xpRequired: 6200 },
  { level: 11, xpRequired: 8200 },
  { level: 12, xpRequired: 10700 },
  { level: 13, xpRequired: 13800 },
  { level: 14, xpRequired: 17600 },
  { level: 15, xpRequired: 22200 },
  { level: 16, xpRequired: 27800 },
  { level: 17, xpRequired: 34600 },
  { level: 18, xpRequired: 42800 },
  { level: 19, xpRequired: 52700 },
  { level: 20, xpRequired: 64500 }
]

// Badge definitions
export const BADGES = {
  // First achievements
  first_run: {
    id: 'first_run',
    name: 'Første Løpetur',
    description: 'Fullfør din første løpeøkt',
    icon: '🏃',
    condition: (stats) => stats.totalWorkouts >= 1
  },
  first_week: {
    id: 'first_week',
    name: 'Første Uke',
    description: 'Tren 7 dager på rad',
    icon: '📅',
    condition: (stats) => stats.streaks.longest >= 7
  },

  // Distance milestones
  '10km_club': {
    id: '10km_club',
    name: '10km Klubben',
    description: 'Løp totalt 10km',
    icon: '🎯',
    condition: (stats) => stats.totalDistance >= 10
  },
  '50km_club': {
    id: '50km_club',
    name: '50km Klubben',
    description: 'Løp totalt 50km',
    icon: '⭐',
    condition: (stats) => stats.totalDistance >= 50
  },
  '100km_club': {
    id: '100km_club',
    name: '100km Klubben',
    description: 'Løp totalt 100km',
    icon: '💪',
    condition: (stats) => stats.totalDistance >= 100
  },
  '500km_club': {
    id: '500km_club',
    name: '500km Klubben',
    description: 'Løp totalt 500km',
    icon: '🔥',
    condition: (stats) => stats.totalDistance >= 500
  },
  '1000km_club': {
    id: '1000km_club',
    name: '1000km Klubben',
    description: 'Løp totalt 1000km',
    icon: '🏆',
    condition: (stats) => stats.totalDistance >= 1000
  },

  // Workout count milestones
  '10_workouts': {
    id: '10_workouts',
    name: 'Ti på Rad',
    description: 'Fullfør 10 treningsøkter',
    icon: '🎖️',
    condition: (stats) => stats.totalWorkouts >= 10
  },
  '50_workouts': {
    id: '50_workouts',
    name: 'Halve Hundre',
    description: 'Fullfør 50 treningsøkter',
    icon: '🏅',
    condition: (stats) => stats.totalWorkouts >= 50
  },
  '100_workouts': {
    id: '100_workouts',
    name: 'Century Club',
    description: 'Fullfør 100 treningsøkter',
    icon: '👑',
    condition: (stats) => stats.totalWorkouts >= 100
  },

  // Streak milestones
  week_warrior: {
    id: 'week_warrior',
    name: 'Ukekriger',
    description: 'Tren 7 dager på rad',
    icon: '⚔️',
    condition: (stats) => stats.streaks.current >= 7
  },
  month_master: {
    id: 'month_master',
    name: 'Månedsmester',
    description: 'Tren 30 dager på rad',
    icon: '🎯',
    condition: (stats) => stats.streaks.current >= 30
  },

  // Special achievements
  marathon: {
    id: 'marathon',
    name: 'Maraton',
    description: 'Løp 42.2km i én økt',
    icon: '🏁',
    condition: (stats, workout) => workout?.running?.distance >= 42.2
  },
  early_bird: {
    id: 'early_bird',
    name: 'Morgenfugl',
    description: 'Fullfør 10 økter før kl. 07:00',
    icon: '🌅',
    condition: (stats) => stats.earlyWorkouts >= 10
  },
  night_owl: {
    id: 'night_owl',
    name: 'Nattugle',
    description: 'Fullfør 10 økter etter kl. 21:00',
    icon: '🦉',
    condition: (stats) => stats.lateWorkouts >= 10
  },
  iron_will: {
    id: 'iron_will',
    name: 'Jernvilje',
    description: 'Tren 10 ganger med recovery < 50%',
    icon: '💎',
    condition: (stats) => stats.braveWorkouts >= 10
  }
}

/**
 * Calculate XP for a completed workout
 */
export function calculateWorkoutXP(workout, readiness = null) {
  let xp = 10 // Base XP

  // Duration bonus: +1 XP per 5 minutes
  if (workout.duration) {
    xp += Math.floor(workout.duration / 5)
  }

  // Distance bonus (running): +1 XP per km
  if (workout.running?.distance) {
    xp += Math.floor(workout.running.distance)
  }

  // Type multiplier
  const typeMultipliers = {
    running: 1.2,
    strength: 1.0,
    cycling: 1.1,
    other: 1.0
  }
  const multiplier = typeMultipliers[workout.type] || 1.0
  xp = Math.floor(xp * multiplier)

  // Recovery state bonus
  if (readiness !== null) {
    if (readiness < 50) {
      // Brave: training when tired
      xp = Math.floor(xp * 1.5)
    } else if (readiness >= 80) {
      // Optimal: training when fresh
      xp = Math.floor(xp * 1.2)
    }
  }

  return xp
}

/**
 * Calculate current level from XP
 */
export function calculateLevel(xp) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      return {
        level: LEVELS[i].level,
        currentXP: xp,
        xpRequired: LEVELS[i].xpRequired,
        nextLevelXP: LEVELS[i + 1]?.xpRequired || LEVELS[i].xpRequired,
        progress: LEVELS[i + 1]
          ? ((xp - LEVELS[i].xpRequired) / (LEVELS[i + 1].xpRequired - LEVELS[i].xpRequired)) * 100
          : 100
      }
    }
  }
  return {
    level: 1,
    currentXP: xp,
    xpRequired: 0,
    nextLevelXP: LEVELS[1].xpRequired,
    progress: (xp / LEVELS[1].xpRequired) * 100
  }
}

/**
 * Get or initialize gamification data for user
 */
export async function getGamificationData(userId) {
  try {
    const docRef = doc(db, 'users', userId, 'gamification', 'data')
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return docSnap.data()
    } else {
      // Initialize new gamification data
      const initialData = {
        xp: 0,
        level: 1,
        badges: [],
        streaks: {
          current: 0,
          longest: 0,
          lastWorkoutDate: null
        },
        stats: {
          totalWorkouts: 0,
          totalDistance: 0,
          totalDuration: 0,
          earlyWorkouts: 0,
          lateWorkouts: 0,
          braveWorkouts: 0
        }
      }

      await setDoc(docRef, initialData)
      return initialData
    }
  } catch (error) {
    console.error('Error getting gamification data:', error)
    throw error
  }
}

/**
 * Update streak based on workout completion
 */
export function updateStreak(currentStreak, lastWorkoutDate) {
  const today = new Date().toISOString().split('T')[0]

  if (!lastWorkoutDate) {
    // First workout ever
    return {
      current: 1,
      lastWorkoutDate: today
    }
  }

  const lastDate = new Date(lastWorkoutDate)
  const todayDate = new Date(today)
  const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    // Already worked out today, no change
    return {
      current: currentStreak.current,
      lastWorkoutDate: today
    }
  } else if (diffDays === 1) {
    // Consecutive day
    return {
      current: currentStreak.current + 1,
      lastWorkoutDate: today
    }
  } else {
    // Streak broken
    return {
      current: 1,
      lastWorkoutDate: today
    }
  }
}

/**
 * Check and award new badges
 */
export function checkBadges(currentBadges, stats, workout = null) {
  const newBadges = []

  for (const badgeId in BADGES) {
    const badge = BADGES[badgeId]

    // Skip if already earned
    if (currentBadges.includes(badgeId)) continue

    // Check condition
    if (badge.condition(stats, workout)) {
      newBadges.push(badgeId)
    }
  }

  return newBadges
}

/**
 * Award XP and update gamification data after workout
 */
export async function awardWorkoutXP(userId, workout, readiness = null) {
  try {
    const docRef = doc(db, 'users', userId, 'gamification', 'data')
    const data = await getGamificationData(userId)

    // Calculate XP
    const xpGained = calculateWorkoutXP(workout, readiness)
    const newXP = data.xp + xpGained

    // Update stats
    const newStats = {
      ...data.stats,
      totalWorkouts: data.stats.totalWorkouts + 1,
      totalDistance: data.stats.totalDistance + (workout.running?.distance || 0),
      totalDuration: data.stats.totalDuration + (workout.duration || 0)
    }

    // Check for special workout types
    const workoutHour = new Date(workout.date).getHours()
    if (workoutHour < 7) {
      newStats.earlyWorkouts = (newStats.earlyWorkouts || 0) + 1
    }
    if (workoutHour >= 21) {
      newStats.lateWorkouts = (newStats.lateWorkouts || 0) + 1
    }
    if (readiness !== null && readiness < 50) {
      newStats.braveWorkouts = (newStats.braveWorkouts || 0) + 1
    }

    // Update streak
    const newStreakData = updateStreak(data.streaks, data.streaks.lastWorkoutDate)
    const newStreaks = {
      current: newStreakData.current,
      longest: Math.max(data.streaks.longest, newStreakData.current),
      lastWorkoutDate: newStreakData.lastWorkoutDate
    }

    // Check for new badges
    const newBadges = checkBadges(data.badges, { ...newStats, streaks: newStreaks }, workout)

    // Calculate new level
    const levelInfo = calculateLevel(newXP)
    const leveledUp = levelInfo.level > data.level

    // Update database
    const updatedData = {
      xp: newXP,
      level: levelInfo.level,
      badges: [...data.badges, ...newBadges],
      streaks: newStreaks,
      stats: newStats
    }

    await updateDoc(docRef, updatedData)

    return {
      xpGained,
      newXP,
      leveledUp,
      newLevel: levelInfo.level,
      newBadges,
      streakUpdate: newStreakData.current > data.streaks.current,
      currentStreak: newStreakData.current
    }
  } catch (error) {
    console.error('Error awarding XP:', error)
    throw error
  }
}

export default {
  calculateWorkoutXP,
  calculateLevel,
  getGamificationData,
  updateStreak,
  checkBadges,
  awardWorkoutXP,
  BADGES,
  LEVELS
}
