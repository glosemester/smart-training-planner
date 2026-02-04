const admin = require('firebase-admin');
const axios = require('axios');

const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";

const getWhoopConfig = () => {
    return {
        clientId: process.env.WHOOP_CLIENT_ID,
        clientSecret: process.env.WHOOP_CLIENT_SECRET
    };
};

/**
 * Retrieves a valid access token for the user.
 * Refreshes the token if it is expired or about to expire.
 */
exports.getValidWhoopToken = async (userId) => {
    const docRef = admin.firestore()
        .collection('users')
        .doc(userId)
        .collection('integrations')
        .doc('whoop');

    const doc = await docRef.get();

    if (!doc.exists) {
        throw new Error("User is not connected to Whoop.");
    }

    const data = doc.data();
    const now = new Date();
    // Refresh if expired or expires in less than 5 minutes
    const expiresAt = data.expiresAt.toDate();
    const cleanBuffer = 5 * 60 * 1000;

    if (expiresAt.getTime() - now.getTime() < cleanBuffer) {
        console.log(`Token expiring soon (or expired) for user ${userId}. Refreshing...`);
        return await refreshWhoopToken(userId, data.refreshToken, docRef);
    }

    return data.accessToken;
};

/**
 * Refreshes the Whoop access token.
 */
async function refreshWhoopToken(userId, refreshToken, docRef) {
    const config = getWhoopConfig();

    try {
        const response = await axios.post(WHOOP_TOKEN_URL, new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            scope: "offline read:recovery read:cycles read:workout read:sleep read:profile read:body_measurement"
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const { access_token, refresh_token, expires_in } = response.data;
        const newExpiresAt = new Date(Date.now() + expires_in * 1000);

        await docRef.update({
            accessToken: access_token,
            refreshToken: refresh_token, // Whoop might rotate refresh tokens
            expiresAt: newExpiresAt,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`Refreshed Whoop token for user ${userId}`);
        return access_token;

    } catch (error) {
        console.error("Failed to refresh Whoop token:", error?.response?.data || error.message);
        // If refresh fails (e.g., revoked), we might want to mark as disconnected
        if (error?.response?.status === 400 || error?.response?.status === 401) {
            await docRef.update({ isConnected: false });
        }
        throw new Error("Failed to refresh Whoop token provided.");
    }
}
