/**
 * Safe utility class mapping for dynamic colors
 * Prevents Tailwind purge issues in production builds
 *
 * IMPORTANT: Dynamic template literals like `bg-${color}-500` won't work
 * in production because Tailwind's purge can't detect them.
 * Use these functions instead.
 */

/**
 * Get metric card styles based on color
 * @param {string} color - Color name (blue, red, green, etc.)
 * @returns {string} - Tailwind class string
 */
export const getMetricStyles = (color) => {
  const styles = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    red: 'bg-red-500/10 text-red-400 border-red-500/30',
    green: 'bg-green-500/10 text-green-400 border-green-500/30',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    pink: 'bg-pink-500/10 text-pink-400 border-pink-500/30'
  }
  return styles[color] || styles.blue
}

/**
 * Get icon color class
 * @param {string} color - Color name
 * @returns {string} - Tailwind text color class
 */
export const getIconColor = (color) => {
  const colors = {
    blue: 'text-blue-400',
    red: 'text-red-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400',
    cyan: 'text-cyan-400',
    pink: 'text-pink-400'
  }
  return colors[color] || 'text-blue-400'
}

/**
 * Get training phase badge styles
 * @param {string} phase - Phase name (base, build, peak, taper)
 * @returns {string} - Tailwind class string
 */
export const getPhaseBadgeStyles = (phase) => {
  const styles = {
    base: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    build: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    peak: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    taper: 'bg-green-500/10 text-green-400 border-green-500/20'
  }
  return styles[phase] || styles.base
}

/**
 * Get readiness color based on score
 * @param {number} score - Readiness score (0-100)
 * @returns {string} - Color name
 */
export const getReadinessColor = (score) => {
  if (score >= 67) return 'green'
  if (score >= 34) return 'yellow'
  return 'red'
}

/**
 * Get session type color
 * @param {string} type - Session type (running, strength, cycling, etc.)
 * @returns {string} - Color name
 */
export const getSessionTypeColor = (type) => {
  const colors = {
    running: 'green',
    strength: 'purple',
    cycling: 'cyan',
    hyrox: 'orange',
    crossfit: 'red',
    rest: 'blue',
    yoga: 'pink'
  }
  return colors[type] || 'blue'
}
