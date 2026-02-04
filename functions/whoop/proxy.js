const { onCall, HttpsError } = require("firebase-functions/v2/https");
const axios = require('axios');
const { getValidWhoopToken } = require('./token');

// Base URL without version - version is included in endpoint paths
const WHOOP_API_BASE = "https://api.prod.whoop.com/developer";

/**
 * Callable function to fetch data from Whoop.
 * 
 * Args:
 * - endpoint: string (e.g., '/cycle', '/recovery')
 * - params: object (query parameters like start, end, limit)
 */
exports.fetchWhoopData = onCall(async (request) => {
    // 1. Auth Check
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const userId = request.auth.uid;
    const { endpoint, params } = request.data;

    if (!endpoint) {
        throw new HttpsError('invalid-argument', 'The "endpoint" argument is required.');
    }

    try {
        // 2. Get Valid Token
        const accessToken = await getValidWhoopToken(userId);

        // 3. Make Request to Whoop
        // Ensure endpoint starts with /
        const safeEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${WHOOP_API_BASE}${safeEndpoint}`;

        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            params: params || {}
        });

        return response.data;

    } catch (error) {
        console.error(`Error fetching Whoop data for ${endpoint}:`, error);

        if (error.message === "User is not connected to Whoop.") {
            throw new HttpsError('failed-precondition', 'User is not connected to Whoop.');
        }

        // Handle Axios errors
        if (error.response) {
            // Rate limiting
            if (error.response.status === 429) {
                throw new HttpsError('resource-exhausted', 'Whoop API rate limit exceeded.');
            }
            // Auth errors
            if (error.response.status === 401) {
                throw new HttpsError('unauthenticated', 'Whoop session expired. Please reconnect.');
            }

            throw new HttpsError('internal', `Whoop API Error: ${error.response.status} ${error.response.statusText}`);
        }

        throw new HttpsError('internal', error.message || 'Unknown error occurred.');
    }
});
