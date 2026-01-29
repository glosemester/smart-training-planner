/**
 * Strava History Service
 * Henter og analyserer brukerens treningshistorikk fra Strava
 */

import { db, functions } from '../config/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'

const STRAVA_API_BASE = 'https://www.strava.com/api/v3'

/**
 * Sjekk om brukeren har gyldig Strava-tilkobling
 */
export async function checkStravaConnection(userId) {
    try {
        const userDocRef = doc(db, "users", userId)
        const userDoc = await getDoc(userDocRef)

        if (!userDoc.exists()) return { connected: false }

        const tokens = userDoc.data().stravaTokens
        if (!tokens?.access_token) return { connected: false }

        return {
            connected: true,
            athleteId: tokens.athlete_id,
            expiresAt: tokens.expires_at
        }
    } catch (error) {
        console.error('Error checking Strava connection:', error)
        return { connected: false, error: error.message }
    }
}

/**
 * Hent gyldig access token (refresh hvis utløpt)
 */
async function getValidAccessToken(userId) {
    const userDocRef = doc(db, "users", userId)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) throw new Error("User not found")

    const tokens = userDoc.data().stravaTokens
    if (!tokens?.access_token) throw new Error("Strava not connected")

    // Sjekk om token er utløpt (med 5 min buffer)
    const isExpired = (tokens.expires_at * 1000) < (Date.now() + 5 * 60 * 1000)

    if (isExpired) {
        console.log('🔄 Strava token expired, refreshing...')
        const refreshTokenFn = httpsCallable(functions, 'refreshStravaToken')
        const result = await refreshTokenFn({ userId })
        return result.data.access_token
    }

    return tokens.access_token
}

/**
 * Hent aktiviteter fra Strava for siste N uker
 */
export async function fetchStravaActivities(userId, weeks = 4) {
    const accessToken = await getValidAccessToken(userId)

    // Beregn timestamp for N uker siden
    const afterTimestamp = Math.floor(Date.now() / 1000) - (weeks * 7 * 24 * 60 * 60)

    const response = await fetch(
        `${STRAVA_API_BASE}/athlete/activities?after=${afterTimestamp}&per_page=100`,
        {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        }
    )

    if (!response.ok) {
        throw new Error(`Strava API error: ${response.status}`)
    }

    return response.json()
}

/**
 * Formater pace fra sekunder per km til "mm:ss" format
 */
function formatPace(secondsPerKm) {
    if (!secondsPerKm || !isFinite(secondsPerKm)) return null
    const minutes = Math.floor(secondsPerKm / 60)
    const seconds = Math.round(secondsPerKm % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Beregn hvilken uke en aktivitet tilhører (uker siden nå, 0 = denne uken)
 */
function getWeekNumber(dateString) {
    const activityDate = new Date(dateString)
    const now = new Date()
    const diffMs = now - activityDate
    const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
    return diffWeeks
}

// Aktivitetstyper som er relevante for treningsplanlegging
// Aktivitetstyper som er relevante for treningsplanlegging
const RELEVANT_ACTIVITY_TYPES = ['Run', 'Workout', 'WeightTraining', 'Crossfit', 'HIIT', 'Walk', 'Hike', 'Ride', 'Swim', 'Yoga']

/**
 * Grupper aktiviteter etter type
 */
function groupByType(activities) {
    return activities.reduce((acc, a) => {
        acc[a.type] = (acc[a.type] || 0) + 1
        return acc
    }, {})
}

/**
 * Analyser treningshistorikk fra Strava-aktiviteter
 * Returnerer nøkkeltall for bruk i AI-planlegging
 */
export function analyzeStravaHistory(activities) {
    // Filtrer løpeaktiviteter
    const runs = activities.filter(a => a.type === 'Run')

    // Filtrer andre relevante treningsaktiviteter (HIIT, Hyrox, styrke osv.)
    const otherWorkouts = activities.filter(a =>
        RELEVANT_ACTIVITY_TYPES.includes(a.type) && a.type !== 'Run'
    )

    if (runs.length === 0 && otherWorkouts.length === 0) {
        return {
            totalRuns: 0,
            totalKm: 0,
            weeklyAvgKm: 0,
            longestRun: 0,
            avgPace: null,
            avgPaceSeconds: null,
            consistency: 0,
            trend: 'stable',
            weekByWeek: [],
            otherWorkouts: { total: 0, byType: {}, weeklyAvg: 0, totalDuration: 0 },
            hasEnoughData: false,
            totalActivities: 0
        }
    }

    // Hvis kun andre aktiviteter (ingen løping)
    if (runs.length === 0 && otherWorkouts.length > 0) {
        const otherWorkoutStats = {
            total: otherWorkouts.length,
            byType: groupByType(otherWorkouts),
            weeklyAvg: Math.round((otherWorkouts.length / 4) * 10) / 10,
            totalDuration: Math.round(otherWorkouts.reduce((sum, w) => sum + (w.moving_time || 0), 0) / 60)
        }
        return {
            totalRuns: 0,
            totalKm: 0,
            weeklyAvgKm: 0,
            longestRun: 0,
            avgPace: null,
            avgPaceSeconds: null,
            consistency: Math.round((otherWorkouts.length > 0 ? 1 : 0) * 100 / 4),
            trend: 'stable',
            weekByWeek: [],
            otherWorkouts: otherWorkoutStats,
            hasEnoughData: otherWorkouts.length >= 4,
            totalActivities: otherWorkouts.length
        }
    }

    // Grunnleggende statistikk
    const totalKm = runs.reduce((sum, r) => sum + (r.distance / 1000), 0)
    const longestRun = Math.max(...runs.map(r => r.distance / 1000))

    // Gjennomsnittspacing (vektet etter distanse)
    let totalPaceWeighted = 0
    let totalDistanceForPace = 0
    runs.forEach(run => {
        if (run.moving_time && run.distance > 0) {
            const paceSecondsPerKm = run.moving_time / (run.distance / 1000)
            totalPaceWeighted += paceSecondsPerKm * run.distance
            totalDistanceForPace += run.distance
        }
    })
    const avgPaceSeconds = totalDistanceForPace > 0
        ? totalPaceWeighted / totalDistanceForPace
        : null

    // Uke-for-uke analyse
    const weekMap = new Map()
    runs.forEach(run => {
        const weekNum = getWeekNumber(run.start_date)
        if (weekNum >= 0 && weekNum < 4) { // Kun siste 4 uker
            if (!weekMap.has(weekNum)) {
                weekMap.set(weekNum, { km: 0, runs: 0 })
            }
            const week = weekMap.get(weekNum)
            week.km += run.distance / 1000
            week.runs += 1
        }
    })

    // Konverter til array, sorter og fyll inn manglende uker
    const weekByWeek = []
    for (let i = 3; i >= 0; i--) {
        const weekData = weekMap.get(i) || { km: 0, runs: 0 }
        weekByWeek.push({
            weeksAgo: i,
            weekLabel: i === 0 ? 'Denne uken' : i === 1 ? 'Forrige uke' : `${i} uker siden`,
            km: Math.round(weekData.km * 10) / 10,
            runs: weekData.runs
        })
    }

    // Beregn ukentlig gjennomsnitt (kun uker med aktivitet for å unngå skjevhet)
    const weeksWithActivity = weekByWeek.filter(w => w.runs > 0).length
    const weeklyAvgKm = weeksWithActivity > 0
        ? totalKm / weeksWithActivity
        : 0

    // Konsistens: % av uker med minst 1 løpetur
    const consistency = Math.round((weeksWithActivity / 4) * 100)

    // Trend: sammenlign siste 2 uker mot tidligere 2 uker
    const recentKm = (weekByWeek[3]?.km || 0) + (weekByWeek[2]?.km || 0)
    const earlierKm = (weekByWeek[1]?.km || 0) + (weekByWeek[0]?.km || 0)

    let trend = 'stable'
    if (earlierKm > 0) {
        const changePercent = ((recentKm - earlierKm) / earlierKm) * 100
        if (changePercent > 15) trend = 'increasing'
        else if (changePercent < -15) trend = 'decreasing'
    }

    // Beregn statistikk for andre aktiviteter
    const otherWorkoutStats = {
        total: otherWorkouts.length,
        byType: groupByType(otherWorkouts),
        weeklyAvg: Math.round((otherWorkouts.length / 4) * 10) / 10,
        totalDuration: Math.round(otherWorkouts.reduce((sum, w) => sum + (w.moving_time || 0), 0) / 60), // minutter
        // NEW: Detailed stats requested by user
        lastActivityDate: otherWorkouts.length > 0 ? otherWorkouts[0].start_date : null
    }

    return {
        // Løpe-statistikk
        totalRuns: runs.length,
        totalKm: Math.round(totalKm * 10) / 10,
        weeklyAvgKm: Math.round(weeklyAvgKm * 10) / 10,
        longestRun: Math.round(longestRun * 10) / 10,
        avgPace: formatPace(avgPaceSeconds),
        avgPaceSeconds: avgPaceSeconds ? Math.round(avgPaceSeconds) : null,
        consistency,
        trend,
        weekByWeek,

        // Andre treningsaktiviteter med detaljer
        otherWorkouts: otherWorkoutStats,

        // Total vurdering
        hasEnoughData: runs.length >= 3 || (runs.length + otherWorkouts.length) >= 4,
        totalActivities: runs.length + otherWorkouts.length
    }
}

/**
 * Hovedfunksjon: Hent og analyser Strava-historikk
 */
export async function getStravaHistoryAnalysis(userId, weeks = 4) {
    console.log('📊 Fetching Strava history for analysis...')

    try {
        const activities = await fetchStravaActivities(userId, weeks)
        console.log(`✅ Fetched ${activities.length} activities from Strava`)

        const analysis = analyzeStravaHistory(activities)
        console.log('📈 Strava analysis complete:', analysis)

        return {
            success: true,
            analysis,
            rawActivitiesCount: activities.length
        }
    } catch (error) {
        console.error('❌ Strava history fetch failed:', error)
        return {
            success: false,
            error: error.message,
            analysis: null
        }
    }
}

export default {
    checkStravaConnection,
    fetchStravaActivities,
    analyzeStravaHistory,
    getStravaHistoryAnalysis
}
