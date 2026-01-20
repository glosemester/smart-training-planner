/**
 * Plan Comparison Service
 * Sammenligner planlagte økter med faktisk gjennomførte økter
 */

/**
 * Sammenlign planlagt uke med faktisk gjennomføring
 */
export function compareActualVsPlanned(plan, actualWorkouts) {
  if (!plan || !plan.sessions) {
    return null
  }

  const analysis = {
    completed: [],      // Økter gjort som planlagt
    modified: [],       // Økter gjort, men annerledes
    skipped: [],        // Planlagte økter som ikke ble gjort
    extra: [],          // Økter som ikke var planlagt
    totalLoadDiff: {    // Forskjell i total belastning
      runningKm: 0,
      strengthSessions: 0,
      totalMinutes: 0
    }
  }

  // Hent planens datoperiode
  const weekStart = new Date(plan.weekStart)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  // Filtrer workouts til riktig uke
  const weekWorkouts = actualWorkouts.filter(workout => {
    const workoutDate = new Date(workout.date)
    return workoutDate >= weekStart && workoutDate < weekEnd
  })

  // Analyser hver planlagt økt
  for (const plannedSession of plan.sessions) {
    const matchingWorkout = findMatchingWorkout(weekWorkouts, plannedSession, weekStart)

    if (!matchingWorkout) {
      analysis.skipped.push(plannedSession)
    } else {
      const differences = calculateDifferences(matchingWorkout, plannedSession)

      if (differences.isSignificant) {
        analysis.modified.push({
          planned: plannedSession,
          actual: matchingWorkout,
          differences
        })
      } else {
        analysis.completed.push({
          planned: plannedSession,
          actual: matchingWorkout
        })
      }
    }
  }

  // Finn uplanlagte økter
  for (const workout of weekWorkouts) {
    const hasMatch = plan.sessions.some(session =>
      matchesSession(workout, session, weekStart)
    )

    if (!hasMatch) {
      analysis.extra.push(workout)
    }
  }

  // Beregn total belastningsforskjell
  analysis.totalLoadDiff = calculateLoadDifference(plan, weekWorkouts)

  return analysis
}

/**
 * Finn workout som matcher en planlagt session
 */
function findMatchingWorkout(workouts, plannedSession, weekStart) {
  // Konverter dag til dato
  const sessionDate = getDateForDay(plannedSession.day, weekStart)

  // Søk etter workout på samme dag med samme type
  const candidates = workouts.filter(workout => {
    const workoutDate = new Date(workout.date)
    return isSameDay(workoutDate, sessionDate) &&
           isSameType(workout.type, plannedSession.type)
  })

  if (candidates.length === 0) {
    // Ingen match på nøyaktig dag, søk innenfor +/- 1 dag
    const flexibleCandidates = workouts.filter(workout => {
      const workoutDate = new Date(workout.date)
      const dayDiff = Math.abs((workoutDate - sessionDate) / (1000 * 60 * 60 * 24))
      return dayDiff <= 1 && isSameType(workout.type, plannedSession.type)
    })

    return flexibleCandidates[0] || null
  }

  return candidates[0]
}

/**
 * Sjekk om en workout matcher en session
 */
function matchesSession(workout, session, weekStart) {
  const sessionDate = getDateForDay(session.day, weekStart)
  const workoutDate = new Date(workout.date)
  const dayDiff = Math.abs((workoutDate - sessionDate) / (1000 * 60 * 60 * 24))

  return dayDiff <= 1 && isSameType(workout.type, session.type)
}

/**
 * Sjekk om to datoer er samme dag
 */
function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate()
}

/**
 * Sjekk om to treningstyper er like
 */
function isSameType(workoutType, sessionType) {
  // Mapping mellom workout types og session types
  const typeMap = {
    'easy_run': ['easy_run', 'recovery'],
    'long_run': ['long_run'],
    'tempo': ['tempo'],
    'interval': ['interval'],
    'hyrox': ['hyrox', 'crossfit'],
    'crossfit': ['hyrox', 'crossfit'],
    'strength': ['strength'],
    'recovery': ['recovery', 'easy_run']
  }

  const workoutTypes = typeMap[workoutType] || [workoutType]
  return workoutTypes.includes(sessionType) || workoutType === sessionType
}

/**
 * Konverter dag-navn til dato
 */
function getDateForDay(dayName, weekStart) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const dayIndex = days.indexOf(dayName)

  if (dayIndex === -1) return weekStart

  const date = new Date(weekStart)
  date.setDate(weekStart.getDate() + dayIndex)
  return date
}

/**
 * Beregn forskjeller mellom planlagt og faktisk
 */
function calculateDifferences(workout, plannedSession) {
  const differences = {
    isSignificant: false,
    duration: 0,
    distance: 0,
    intensity: null,
    notes: []
  }

  // Varighet
  if (workout.duration && plannedSession.duration_minutes) {
    const durationDiff = workout.duration - plannedSession.duration_minutes
    differences.duration = durationDiff

    if (Math.abs(durationDiff) > 15) {
      differences.isSignificant = true
      differences.notes.push(
        durationDiff > 0
          ? `${durationDiff} min lengre enn planlagt`
          : `${Math.abs(durationDiff)} min kortere enn planlagt`
      )
    }
  }

  // Distanse (for løping)
  if (workout.running?.distance && plannedSession.details?.distance_km) {
    const distanceDiff = workout.running.distance - plannedSession.details.distance_km
    differences.distance = distanceDiff

    if (Math.abs(distanceDiff) > 2) {
      differences.isSignificant = true
      differences.notes.push(
        distanceDiff > 0
          ? `${distanceDiff.toFixed(1)} km lengre enn planlagt`
          : `${Math.abs(distanceDiff).toFixed(1)} km kortere enn planlagt`
      )
    }
  }

  // RPE/intensitet
  if (workout.rpe && plannedSession.details?.pace_zone) {
    const expectedRPE = zoneToRPE(plannedSession.details.pace_zone)
    const rpeDiff = Math.abs(workout.rpe - expectedRPE)

    if (rpeDiff > 2) {
      differences.isSignificant = true
      differences.intensity = workout.rpe > expectedRPE ? 'higher' : 'lower'
      differences.notes.push(
        workout.rpe > expectedRPE
          ? 'Høyere intensitet enn planlagt'
          : 'Lavere intensitet enn planlagt'
      )
    }
  }

  return differences
}

/**
 * Konverter treningssone til RPE
 */
function zoneToRPE(zone) {
  const zoneMap = {
    'Z1': 3,
    'Z2': 4,
    'Z3': 6,
    'Z4': 8,
    'Z5': 9
  }
  return zoneMap[zone] || 5
}

/**
 * Beregn total belastningsforskjell
 */
function calculateLoadDifference(plan, actualWorkouts) {
  // Planlagt belastning
  const plannedLoad = {
    runningKm: plan.totalLoad?.running_km || 0,
    strengthSessions: plan.totalLoad?.strength_sessions || 0,
    totalMinutes: plan.sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
  }

  // Faktisk belastning
  const actualLoad = {
    runningKm: actualWorkouts
      .filter(w => w.running?.distance)
      .reduce((sum, w) => sum + w.running.distance, 0),
    strengthSessions: actualWorkouts
      .filter(w => ['strength', 'hyrox', 'crossfit'].includes(w.type))
      .length,
    totalMinutes: actualWorkouts
      .reduce((sum, w) => sum + (w.duration || 0), 0)
  }

  return {
    runningKm: actualLoad.runningKm - plannedLoad.runningKm,
    strengthSessions: actualLoad.strengthSessions - plannedLoad.strengthSessions,
    totalMinutes: actualLoad.totalMinutes - plannedLoad.totalMinutes
  }
}

/**
 * Generer human-readable summary
 */
export function generateSummary(analysis) {
  if (!analysis) return ''

  const parts = []

  // Completion rate
  const totalPlanned = analysis.completed.length + analysis.modified.length + analysis.skipped.length
  const completionRate = totalPlanned > 0
    ? Math.round(((analysis.completed.length + analysis.modified.length) / totalPlanned) * 100)
    : 0

  parts.push(`Fullført ${completionRate}% av planlagte økter`)

  // Skipped sessions
  if (analysis.skipped.length > 0) {
    parts.push(`${analysis.skipped.length} økter ble hoppet over`)
  }

  // Extra sessions
  if (analysis.extra.length > 0) {
    parts.push(`${analysis.extra.length} ekstra økter`)
  }

  // Load difference
  const load = analysis.totalLoadDiff
  if (Math.abs(load.runningKm) > 2) {
    parts.push(
      load.runningKm > 0
        ? `${load.runningKm.toFixed(1)} km mer løping enn planlagt`
        : `${Math.abs(load.runningKm).toFixed(1)} km mindre løping enn planlagt`
    )
  }

  return parts.join('. ')
}

export default {
  compareActualVsPlanned,
  generateSummary
}
