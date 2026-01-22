/**
 * Planoppfølging (Plan Adherence) - Algoritme for å analysere faktisk vs planlagt trening
 */

import { differenceInDays, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns'

/**
 * Beregn total gjennomføringsgrad
 */
export function calculateOverallAdherence(plans) {
  if (!plans || plans.length === 0) {
    return {
      totalPlanned: 0,
      totalCompleted: 0,
      percentage: 0
    }
  }

  const totalPlanned = plans.reduce((sum, plan) => {
    return sum + (plan.sessions?.length || 0)
  }, 0)

  const totalCompleted = plans.reduce((sum, plan) => {
    return sum + (plan.sessions?.filter(s => s.status === 'completed').length || 0)
  }, 0)

  return {
    totalPlanned,
    totalCompleted,
    percentage: totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0
  }
}

/**
 * Beregn konsistens (consistency) - hvor jevnt fordelt er treningen din?
 */
export function calculateConsistency(plans, workouts) {
  if (!plans || plans.length === 0) {
    return {
      score: 0,
      weeksWithWorkouts: 0,
      totalWeeks: 0,
      message: 'Ingen data tilgjengelig'
    }
  }

  // Finn alle unike uker med planlagte økter
  const planWeeks = new Set()
  plans.forEach(plan => {
    if (plan.weekStart) {
      const weekStart = typeof plan.weekStart === 'string'
        ? parseISO(plan.weekStart)
        : plan.weekStart.toDate?.() || plan.weekStart
      planWeeks.add(weekStart.toISOString().split('T')[0])
    }
  })

  // Finn alle uker med gjennomførte økter (fra både planer og standalone workouts)
  const completedWeeks = new Set()

  // Fra planer
  plans.forEach(plan => {
    const hasCompleted = plan.sessions?.some(s => s.status === 'completed')
    if (hasCompleted && plan.weekStart) {
      const weekStart = typeof plan.weekStart === 'string'
        ? parseISO(plan.weekStart)
        : plan.weekStart.toDate?.() || plan.weekStart
      completedWeeks.add(weekStart.toISOString().split('T')[0])
    }
  })

  // Fra standalone workouts
  workouts.forEach(workout => {
    const workoutDate = workout.date?.toDate?.() || new Date(workout.date)
    const weekStart = startOfWeek(workoutDate, { weekStartsOn: 1 })
    completedWeeks.add(weekStart.toISOString().split('T')[0])
  })

  const totalWeeks = planWeeks.size
  const weeksWithWorkouts = completedWeeks.size
  const score = totalWeeks > 0 ? Math.round((weeksWithWorkouts / totalWeeks) * 100) : 0

  let message = ''
  if (score >= 90) message = 'Eksepsjonelt konsistent! 🔥'
  else if (score >= 75) message = 'Veldig god konsistens! 💪'
  else if (score >= 60) message = 'God konsistens, fortsett sånn! 👍'
  else if (score >= 40) message = 'Rom for forbedring i konsistensen'
  else message = 'Prøv å trene mer regelmessig'

  return {
    score,
    weeksWithWorkouts,
    totalWeeks,
    message
  }
}

/**
 * Beregn volumoppfølging - planlagt vs faktisk løpevolum
 */
export function calculateVolumeAdherence(plans, workouts) {
  let plannedKm = 0
  let completedKm = 0

  // Beregn planlagt volum fra planer
  plans.forEach(plan => {
    plan.sessions?.forEach(session => {
      if (session.details?.distance_km) {
        plannedKm += session.details.distance_km
      }
    })
  })

  // Beregn faktisk volum fra workouts
  workouts.forEach(workout => {
    if (workout.running?.distance) {
      completedKm += workout.running.distance
    }
  })

  const percentage = plannedKm > 0 ? Math.round((completedKm / plannedKm) * 100) : 0

  let message = ''
  if (percentage >= 95 && percentage <= 105) message = 'Perfekt volumoppfølging! 🎯'
  else if (percentage >= 85 && percentage <= 115) message = 'God volumoppfølging! 👍'
  else if (percentage < 85) message = 'Du løper mindre enn planlagt'
  else message = 'Du løper mer enn planlagt - pass på overtrening!'

  return {
    plannedKm: Math.round(plannedKm * 10) / 10,
    completedKm: Math.round(completedKm * 10) / 10,
    percentage,
    message
  }
}

/**
 * Beregn økttypefordeling - følger du variasjonen i planen?
 */
export function calculateSessionTypeDistribution(plans) {
  const planned = {}
  const completed = {}

  plans.forEach(plan => {
    plan.sessions?.forEach(session => {
      const type = session.type

      // Telle planlagte
      planned[type] = (planned[type] || 0) + 1

      // Telle gjennomførte
      if (session.status === 'completed') {
        completed[type] = (completed[type] || 0) + 1
      }
    })
  })

  // Beregn oppfølging per type
  const distribution = Object.keys(planned).map(type => {
    const plannedCount = planned[type]
    const completedCount = completed[type] || 0
    const percentage = Math.round((completedCount / plannedCount) * 100)

    return {
      type,
      planned: plannedCount,
      completed: completedCount,
      percentage
    }
  }).sort((a, b) => b.planned - a.planned)

  return distribution
}

/**
 * Finn svakeste områder - hvor kan du forbedre deg?
 */
export function findWeakAreas(distribution) {
  const weakAreas = distribution
    .filter(d => d.percentage < 70 && d.planned >= 3)
    .sort((a, b) => a.percentage - b.percentage)

  return weakAreas.map(area => {
    const typeName = getWorkoutTypeName(area.type)
    return {
      type: area.type,
      typeName,
      percentage: area.percentage,
      message: `Du mangler ${area.planned - area.completed} ${typeName}-økter`
    }
  })
}

/**
 * Beregn trend over tid - blir du bedre på å følge planen?
 */
export function calculateTrend(plans) {
  if (!plans || plans.length < 2) {
    return {
      direction: 'insufficient_data',
      message: 'Trenger mer data for å vise trend',
      change: 0
    }
  }

  // Sorter planer etter dato
  const sortedPlans = [...plans].sort((a, b) => {
    const dateA = typeof a.weekStart === 'string' ? parseISO(a.weekStart) : a.weekStart.toDate?.() || a.weekStart
    const dateB = typeof b.weekStart === 'string' ? parseISO(b.weekStart) : b.weekStart.toDate?.() || b.weekStart
    return dateA - dateB
  })

  // Beregn gjennomføringsgrad for første halvdel og andre halvdel
  const midpoint = Math.floor(sortedPlans.length / 2)
  const firstHalf = sortedPlans.slice(0, midpoint)
  const secondHalf = sortedPlans.slice(midpoint)

  const firstHalfAdherence = calculateOverallAdherence(firstHalf).percentage
  const secondHalfAdherence = calculateOverallAdherence(secondHalf).percentage

  const change = secondHalfAdherence - firstHalfAdherence

  let direction = 'stable'
  let message = ''

  if (change > 10) {
    direction = 'improving'
    message = `Du har forbedret deg med ${Math.round(change)}%! 📈`
  } else if (change < -10) {
    direction = 'declining'
    message = `Oppfølgingen har gått ned med ${Math.round(Math.abs(change))}% 📉`
  } else {
    direction = 'stable'
    message = 'Stabil oppfølging over tid'
  }

  return {
    direction,
    message,
    change: Math.round(change),
    firstHalfAdherence,
    secondHalfAdherence
  }
}

/**
 * Generer AI-vennlig oppsummering for chat context
 */
export function generateAdherenceSummary(plans, workouts) {
  const overall = calculateOverallAdherence(plans)
  const consistency = calculateConsistency(plans, workouts)
  const volume = calculateVolumeAdherence(plans, workouts)
  const distribution = calculateSessionTypeDistribution(plans)
  const weakAreas = findWeakAreas(distribution)
  const trend = calculateTrend(plans)

  return {
    overall,
    consistency,
    volume,
    distribution,
    weakAreas,
    trend,
    summary: `Bruker har ${overall.percentage}% total gjennomføring av planlagte økter (${overall.totalCompleted}/${overall.totalPlanned}). ` +
             `Konsistens: ${consistency.score}% av ukene har aktivitet. ` +
             `Volumoppfølging: ${volume.percentage}% (${volume.completedKm}/${volume.plannedKm} km). ` +
             `Trend: ${trend.message}`
  }
}

/**
 * Hjelpefunksjon: Få norsk navn for treningstype
 */
function getWorkoutTypeName(type) {
  const names = {
    easy_run: 'rolige løpeturer',
    tempo: 'tempoløp',
    interval: 'intervaller',
    long_run: 'langtur',
    hyrox: 'Hyrox',
    crossfit: 'CrossFit',
    strength: 'styrke',
    rest: 'hvile',
    recovery: 'restitusjon'
  }
  return names[type] || type
}
