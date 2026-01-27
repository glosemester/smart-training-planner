/**
 * Share achievement using Web Share API
 */
export async function shareAchievement(type, data) {
  const shareData = getShareData(type, data)

  if (!shareData) {
    console.error('Invalid share type or data')
    return false
  }

  // Check if Web Share API is supported
  if (navigator.share) {
    try {
      await navigator.share(shareData)
      return true
    } catch (error) {
      // User cancelled or error occurred
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error)
      }
      return false
    }
  } else {
    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareData.text)
      return true
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      return false
    }
  }
}

/**
 * Generate share data based on achievement type
 */
function getShareData(type, data) {
  const baseUrl = window.location.origin

  switch (type) {
    case 'streak':
      return {
        title: '🔥 RunCoach Streak!',
        text: `Jeg har trent ${data.days} dager på rad! 💪 #RunCoach #Training #Fitness`,
        url: baseUrl
      }

    case 'workout':
      return {
        title: '💪 Trening fullført!',
        text: `Nettopp fullført: ${data.title || data.type} ${data.duration ? `(${data.duration} min)` : ''}! 🎉 #RunCoach #Training`,
        url: baseUrl
      }

    case 'weekly_goal':
      return {
        title: '🎯 Ukemål nådd!',
        text: `Fullførte ${data.completed}/${data.planned} økter denne uken (${data.rate}%)! 💪 #RunCoach #WeeklyGoals`,
        url: baseUrl
      }

    case 'monthly_goal':
      return {
        title: '📊 Månedsmål nådd!',
        text: `${data.completed} økter fullført denne måneden! 🚀 #RunCoach #MonthlyGoals #Fitness`,
        url: baseUrl
      }

    case 'milestone':
      return {
        title: '🏆 Milepæl nådd!',
        text: `${data.title}: ${data.value}! 🎉 #RunCoach #Milestone #Fitness`,
        url: baseUrl
      }

    default:
      return null
  }
}

/**
 * Check if sharing is supported
 */
export function isSharingSupported() {
  return navigator.share || navigator.clipboard
}

/**
 * Generate shareable workout summary
 */
export function generateWorkoutSummary(workout) {
  const parts = []

  if (workout.title) parts.push(workout.title)
  if (workout.duration) parts.push(`${workout.duration} min`)
  if (workout.running?.distance) parts.push(`${workout.running.distance} km`)
  if (workout.rpe) parts.push(`RPE ${workout.rpe}/10`)

  return parts.join(' • ')
}
