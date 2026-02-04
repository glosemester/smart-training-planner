import { db, functions } from '../config/firebase'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'

const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize"
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token"
// NOTE: Client ID is public, but Secret should be kept safe. 
// Ideally receiving the token should happen via a Cloud Function to hide the Secret, 
// but for this implementation we might do it client side if we don't have a backend proxy set up yet.
// However, the user updated secrets in Firebase functions: secrets:set STRAVA_CLIENT_SECRET.
// This implies we should exchange token on backend OR we accept doing it here if we put the secret in env vars (less secure).
// Best practice: The callback should hit the app, then the app calls a Cloud Function to exchange code for token.
// The user prompt said: "Lag en ny fil: src/services/stravaService.js. Denne skal håndtere: Sende brukeren til Strava... Hente ut code... Bytte code mot access_token... Lagre disse".
// If I do it purely frontend, I need the CLIENT_SECRET in the frontend, which is bad.
// But let's look at the user prompt: "Bytte code mot en access_token og refresh_token. Lagre disse tokenene i brukerens Firestore-dokument".
// Ideally, I should create a Cloud Function for the token exchange to keep the secret safe. 
// But strictly following the prompt instructions to "Implement OAuth-flyten... i src/services/stravaService.js" suggests frontend logic.
// I'll assume for now I should use a Cloud Function if I want to be "Proff", OR just use the secret if I assume this is an MVP/Personal app.
// WAIT! I don't have the secret here. It's in Firebase Secrets.
// I CANNOT access Firebase Secrets from the frontend.
// Therefore, the token exchange MUST happen in a Cloud Function.
// The user prompt might have been slightly misleading or I need to add a function for text exchange.
// actually, let's check functions/index.js again. There is no strava exchange function.
// I should probably add one to functions/index.js if I want to do this properly.
// OR, I can ask the user.
// But wait, "Lagre Strava-nøkler i Firebase Secrets... Kjør dette i din terminal".
// This confirms the secret is on the backend.
// So I need a backend function `exchangeStravaToken`.
// I will add this to functions/index.js as well.
// But first, let's write the frontend service to call that function (or redirect).

export async function connectToStrava() {
    const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID;
    const redirectUri = "https://smart-training-app-8bed1.web.app/strava-callback";
    const scope = "activity:read_all";

    // Build OAuth URL - use simple string concatenation
    // Strava is strict about encoding
    const authUrl = `${STRAVA_AUTH_URL}?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&approval_prompt=force&scope=${encodeURIComponent(scope)}`;

    console.log('🔗 Strava OAuth URL:', authUrl);

    window.location.href = authUrl;
}

export async function handleStravaCallback(code, userId) {
    console.log('🔄 Exchanging Strava code for token...', { code: code?.substring(0, 10) + '...', userId });

    try {
        // Call backend function to exchange code for token
        const exchangeTokenFn = httpsCallable(functions, 'exchangeStravaToken');
        const result = await exchangeTokenFn({ code, userId });
        console.log('✅ Strava token exchange successful');
        return result.data;
    } catch (error) {
        console.error('❌ Strava token exchange failed:', {
            code: error.code,
            message: error.message,
            details: error.details
        });
        throw error;
    }
}

export async function getRecentActivities(userId) {
    // We could fetch from Strava directly if we have the token in frontend, 
    // BUT if the token is HTTP-only or stored securely backend, we need a proxy.
    // User said: "Lagre disse tokenene i brukerens Firestore-dokument".
    // So frontend CAN read them from Firestore if it has access.
    // If so, frontend can call Strava API directly using the access_token.

    // 1. Get token from Firestore
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) throw new Error("User not found");

    const tokens = userDoc.data().stravaTokens;
    if (!tokens) throw new Error("Strava not connected");

    let accessToken = tokens.access_token;

    // Check expiry
    if (tokens.expires_at * 1000 < Date.now()) {
        // Token expired, refresh it
        // We need Client Secret to refresh, so we must call backend
        const refreshTokenFn = httpsCallable(functions, 'refreshStravaToken');
        const result = await refreshTokenFn({ userId });
        accessToken = result.data.access_token;
    }

    // 2. Fetch activities with more data
    const response = await fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=30`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!response.ok) throw new Error("Failed to fetch Strava activities");

    const data = await response.json();

    // Map to detailed format with all available Strava data
    return data.map(activity => {
        const distanceKm = activity.distance / 1000;
        const durationMin = Math.round(activity.moving_time / 60);
        const paceMinPerKm = activity.moving_time / 60 / (activity.distance / 1000);

        let paceFormatted = "-";
        if (paceMinPerKm && isFinite(paceMinPerKm)) {
            const min = Math.floor(paceMinPerKm);
            const sec = Math.round((paceMinPerKm - min) * 60);
            paceFormatted = `${min}:${sec < 10 ? '0' : ''}${sec}`;
        }

        return {
            id: activity.id,
            name: activity.name,
            type: activity.type, // Run, Ride, Swim, etc.
            sport_type: activity.sport_type, // More specific type
            distance: Number(distanceKm.toFixed(2)),
            duration: durationMin,
            moving_time: activity.moving_time, // seconds
            elapsed_time: activity.elapsed_time, // total time including pauses
            pace: paceFormatted, // min/km string
            average_speed: activity.average_speed, // m/s
            max_speed: activity.max_speed, // m/s
            start_date: activity.start_date,
            start_date_local: activity.start_date_local,
            timezone: activity.timezone,
            // Heart rate data
            average_heartrate: activity.average_heartrate || null,
            max_heartrate: activity.max_heartrate || null,
            has_heartrate: activity.has_heartrate || false,
            // Elevation data
            total_elevation_gain: activity.total_elevation_gain || 0,
            elev_high: activity.elev_high || null,
            elev_low: activity.elev_low || null,
            // Calories (from power or estimated)
            calories: activity.calories || null,
            kilojoules: activity.kilojoules || null,
            // Cadence (for running)
            average_cadence: activity.average_cadence ? Math.round(activity.average_cadence * 2) : null, // Strava returns half cadence
            // Suffer score / relative effort
            suffer_score: activity.suffer_score || null,
            // Social
            kudos: activity.kudos_count || 0,
            comment_count: activity.comment_count || 0,
            achievement_count: activity.achievement_count || 0,
            // PR count
            pr_count: activity.pr_count || 0,
            // Map/location
            start_latlng: activity.start_latlng,
            end_latlng: activity.end_latlng,
            // Gear
            gear_id: activity.gear_id
        };
    });
}

/**
 * Map Strava activity type to app session type
 */
function mapStravaTypeToAppType(stravaType) {
    const typeMap = {
        'Run': 'running',
        'Workout': 'hyrox',
        'WeightTraining': 'strength',
        'Crossfit': 'crossfit',
        'HIIT': 'hiit',
        'Walk': 'walk',
        'Hike': 'hike'
    }
    return typeMap[stravaType] || 'other'
}

/**
 * Format pace from seconds and distance to "mm:ss" format
 */
function formatPaceFromData(movingTime, distance) {
    if (!movingTime || !distance || distance === 0) return null
    const paceSecondsPerKm = movingTime / (distance / 1000)
    const minutes = Math.floor(paceSecondsPerKm / 60)
    const seconds = Math.round(paceSecondsPerKm % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Finn en matchende Strava-aktivitet for en planlagt økt
 * Brukes til å auto-fylle puls/distanse/tempo ved fullføring
 */
export async function getMatchingStravaActivity(userId, sessionDate, sessionType) {
    try {
        const activities = await getRecentActivities(userId)

        // Finn aktivitet som matcher dato og type (±1 dag)
        const targetDate = new Date(sessionDate)

        const matchingActivity = activities.find(a => {
            const actDate = new Date(a.start_date)
            const dayDiff = Math.abs((actDate - targetDate) / (24 * 60 * 60 * 1000))

            // Må være innen 1 dag
            if (dayDiff > 1) return false

            // Sjekk type-match (løping matcher alle løpetyper)
            const appType = mapStravaTypeToAppType(a.type)
            const sessionIsRunning = ['easy_run', 'tempo', 'interval', 'long_run', 'running'].includes(sessionType)
            const activityIsRunning = a.type === 'Run'

            return (sessionIsRunning && activityIsRunning) || appType === sessionType
        })

        if (matchingActivity) {
            console.log('✅ Found matching Strava activity:', matchingActivity.id)
            return {
                stravaId: matchingActivity.id,
                distance: matchingActivity.distance / 1000, // km
                duration: Math.round(matchingActivity.moving_time / 60), // min
                avgHR: matchingActivity.average_heartrate || null,
                maxHR: matchingActivity.max_heartrate || null,
                avgPace: formatPaceFromData(matchingActivity.moving_time, matchingActivity.distance),
                calories: matchingActivity.kilojoules ? Math.round(matchingActivity.kilojoules * 0.239) : null,
                elevationGain: matchingActivity.total_elevation_gain || null,
                avgSpeed: matchingActivity.average_speed ? (matchingActivity.average_speed * 3.6).toFixed(1) : null, // m/s to km/h
                type: matchingActivity.type
            }
        }

        console.log('ℹ️ No matching Strava activity found for', sessionDate, sessionType)
        return null
    } catch (error) {
        console.error('❌ Error finding matching Strava activity:', error)
        return null
    }
}

export default {
    connectToStrava,
    handleStravaCallback,
    getRecentActivities,
    getMatchingStravaActivity
}
