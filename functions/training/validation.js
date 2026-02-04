/**
 * Plan Validation Module - Enforces HARD RULES
 *
 * This module validates AI-generated training plans against user constraints
 * to ensure the AI respects all hard rules specified in the prompt.
 */

/**
 * Validate entire plan against HARD RULES
 * @param {object} plan - Generated plan from AI
 * @param {object} userData - Original user inputs (trainingType, sessionsPerWeek, etc.)
 * @returns {object} { isValid: boolean, violations: string[] }
 */
function validatePlan(plan, userData) {
  const violations = []

  if (!plan || !plan.weeks || !Array.isArray(plan.weeks)) {
    return {
      isValid: false,
      violations: ['Plan structure is invalid - missing weeks array']
    }
  }

  // Validate each week
  for (const week of plan.weeks) {
    const weekViolations = validateWeek(week, userData)
    violations.push(...weekViolations)
  }

  // CRITICAL: Validate volume progression (10% rule)
  // This ensures progressive overload is enforced
  const progressionViolations = validateVolumeProgression(plan.weeks, userData.currentWeeklyKm || 0)
  violations.push(...progressionViolations)

  return {
    isValid: violations.length === 0,
    violations
  }
}

/**
 * Validate a single week against user constraints
 * @param {object} week - Week data from plan
 * @param {object} userData - User constraints
 * @returns {string[]} Array of violation messages
 */
function validateWeek(week, userData) {
  const violations = []

  const {
    trainingType,
    sessionsPerWeek,
    availableDays = [],
    blockedDays = []
  } = userData

  const allowedDays = availableDays.filter(d => !blockedDays.includes(d))

  // REGEL 1: Treningstype compliance
  if (trainingType === 'running_only') {
    const forbiddenTypes = ['hyrox', 'crossfit', 'strength']
    const forbidden = week.sessions.filter(s => forbiddenTypes.includes(s.type))
    forbidden.forEach(s => {
      violations.push(
        `Week ${week.weekNumber}: Found ${s.type} session "${s.title}" but trainingType is running_only`
      )
    })
  }

  // REGEL 2: Antall økter (ekskluder rest days)
  const nonRestSessions = week.sessions.filter(s => s.type !== 'rest')
  if (nonRestSessions.length !== sessionsPerWeek) {
    violations.push(
      `Week ${week.weekNumber}: Expected ${sessionsPerWeek} sessions but found ${nonRestSessions.length}`
    )
  }

  // REGEL 3: Blokkerte dager (ALDRI trening på blokkerte dager)
  week.sessions
    .filter(s => s.type !== 'rest' && blockedDays.includes(s.day))
    .forEach(s => {
      violations.push(
        `Week ${week.weekNumber}: Session "${s.title}" scheduled on blocked day ${s.day}`
      )
    })

  // REGEL 4: Alle 7 dager må finnes i planen
  const daysInWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const sessionDays = new Set(week.sessions.map(s => s.day))
  const missingDays = daysInWeek.filter(d => !sessionDays.has(d))
  if (missingDays.length > 0) {
    violations.push(
      `Week ${week.weekNumber}: Missing days: ${missingDays.join(', ')}`
    )
  }

  // REGEL 5: Kun trening på tillatte dager
  week.sessions
    .filter(s => s.type !== 'rest' && !allowedDays.includes(s.day))
    .forEach(s => {
      violations.push(
        `Week ${week.weekNumber}: Session "${s.title}" on ${s.day} but only ${allowedDays.join(', ')} allowed`
      )
    })

  return violations
}

/**
 * Validate volume progression (10% rule)
 * @param {array} weeks - All weeks in plan
 * @param {number} startKm - Starting volume
 * @returns {string[]} Array of violation messages
 */
function validateVolumeProgression(weeks, startKm) {
  const violations = []

  for (let i = 0; i < weeks.length - 1; i++) {
    const currentWeek = weeks[i]
    const nextWeek = weeks[i + 1]

    const currentKm = currentWeek.totalLoad?.running_km || 0
    const nextKm = nextWeek.totalLoad?.running_km || 0

    // Skip deload weeks (assume deload if volume drops)
    if (nextKm < currentKm) continue

    const increase = ((nextKm - currentKm) / currentKm) * 100

    if (increase > 10.5) { // Allow 0.5% margin
      violations.push(
        `Week ${nextWeek.weekNumber}: Volume increased by ${increase.toFixed(1)}% (${currentKm}km → ${nextKm}km), exceeds 10% rule`
      )
    }
  }

  return violations
}

module.exports = {
  validatePlan,
  validateWeek,
  validateVolumeProgression
}
