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

    // 2. Fetch activities
    const response = await fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=14`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!response.ok) throw new Error("Failed to fetch Strava activities");

    const data = await response.json();

    // Map to cleaner format
    return data.map(activity => {
        const distanceKm = (activity.distance / 1000).toFixed(2);
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
            type: activity.type, // Run, Ride, etc.
            distance: Number(distanceKm),
            duration: durationMin,
            pace: paceFormatted, // min/km string
            average_speed: activity.average_speed, // m/s (needed for AI context)
            start_date: activity.start_date,
            kudos: activity.kudos_count
        };
    });
}

export default {
    connectToStrava,
    handleStravaCallback,
    getRecentActivities
}
