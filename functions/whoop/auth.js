const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const axios = require('axios');
const crypto = require('crypto');

// Configuration constants
const WHOOP_AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";

// Scopes required for the app
const SCOPES = [
    "offline", // For refresh token
    "read:recovery",
    "read:cycles",
    "read:workout",
    "read:sleep",
    "read:profile",
    "read:body_measurement"
];

const getWhoopConfig = () => {
    return {
        clientId: process.env.WHOOP_CLIENT_ID,
        clientSecret: process.env.WHOOP_CLIENT_SECRET,
        redirectUri: process.env.WHOOP_REDIRECT_URI
    };
};

/**
 * Callable: Generates the Whoop OAuth URL.
 * Apps calls this -> redirects user to the info returned.
 */
exports.getWhoopAuthUrl = onCall(async (request) => {
    // 1. Auth Check
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in to connect Whoop.');
    }
    const userId = request.auth.uid;
    const config = getWhoopConfig();

    // Generate secure state
    const state = crypto.randomBytes(16).toString('hex');

    // Store state with userId mapping to verify later
    await admin.firestore().collection('oauth_states').doc(state).set({
        userId: userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: SCOPES.join(' '),
        state: state
    });

    return { url: `${WHOOP_AUTH_URL}?${params.toString()}` };
});

/**
 * Callable: Exchanges the auth code for tokens.
 * Frontend calls this after detecting ?code=... in the URL.
 */
exports.exchangeWhoopToken = onCall(async (request) => {
    // 1. Auth Check
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated.');
    }
    const { code, state } = request.data;
    const userId = request.auth.uid;

    if (!code || !state) {
        throw new HttpsError('invalid-argument', 'Missing code or state.');
    }

    try {
        // Verify state
        const stateDoc = await admin.firestore().collection('oauth_states').doc(state).get();
        if (!stateDoc.exists) {
            throw new HttpsError('invalid-argument', 'Invalid or expired state param.');
        }

        const stateData = stateDoc.data();
        if (stateData.userId !== userId) {
            throw new HttpsError('permission-denied', 'State does not belong to this user.');
        }

        // Cleanup state
        await admin.firestore().collection('oauth_states').doc(state).delete();

        const config = getWhoopConfig();

        // Exchange code
        const tokenResponse = await axios.post(WHOOP_TOKEN_URL, new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uri: config.redirectUri
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token, refresh_token, expires_in } = tokenResponse.data;
        const expiresAt = new Date(Date.now() + expires_in * 1000);

        // Save tokens
        await admin.firestore()
            .collection('users')
            .doc(userId)
            .collection('integrations')
            .doc('whoop')
            .set({
                accessToken: access_token,
                refreshToken: refresh_token,
                expiresAt: expiresAt,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                isConnected: true
            });

        // Update main profile
        await admin.firestore().collection('users').doc(userId).set({
            integrations: {
                whoop: {
                    isConnected: true,
                    lastConnectedAt: admin.firestore.FieldValue.serverTimestamp()
                }
            }
        }, { merge: true });

        return { success: true };

    } catch (err) {
        console.error("Token Exchange Error:", err?.response?.data || err.message);
        throw new HttpsError('internal', "Failed to connect to Whoop.");
    }
});
