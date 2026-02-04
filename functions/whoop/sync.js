/**
 * whoop/sync.js
 * Syncs Whoop data to Firestore for historical analysis.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');
const { getValidWhoopToken } = require('./token');

// Base URL without version - version is included in endpoint paths
const WHOOP_API_BASE = "https://api.prod.whoop.com/developer";

/**
 * Fetch data from Whoop API.
 */
const fetchWhoopEndpoint = async (accessToken, endpoint, params = {}) => {
    const url = new URL(`${WHOOP_API_BASE}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.append(key, value);
    });

    console.log('Whoop API Request:', { endpoint, params });

    const response = await fetch(url.toString(), {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        const error = await response.text();
        console.error('Whoop API Error:', {
            endpoint,
            status: response.status,
            error
        });
        throw new Error(`Whoop API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    console.log('Whoop API Success:', {
        endpoint,
        recordCount: data.records?.length || 0
    });

    return data;
};

/**
 * Sync Whoop metrics for the last 7 days.
 * Stores data in users/{userId}/metrics/{dateId}
 */
exports.syncWhoopMetrics = onCall({
    timeoutSeconds: 60,
    memory: '256MiB'
}, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const userId = request.auth.uid;

    try {
        // Get valid access token (handles refresh if needed)
        const accessToken = await getValidWhoopToken(userId);
        if (!accessToken) {
            throw new HttpsError('failed-precondition', 'Whoop not connected or token expired.');
        }

        // Calculate date range (last 7 days)
        const end = new Date();
        const start = new Date(end - 7 * 24 * 60 * 60 * 1000);

        // Fetch all data in parallel
        // NOTE: Whoop API v2 endpoints (v1 deprecated Oct 2025):
        // - /v2/activity/sleep - Sleep data
        // - /v2/cycle - Physiological cycles (includes strain AND recovery embedded)
        // BREAKING CHANGE: Recovery is NO LONGER a separate endpoint - it's inside cycle.recovery
        const [sleepData, cycleData] = await Promise.all([
            fetchWhoopEndpoint(accessToken, '/v2/activity/sleep', {
                start: start.toISOString(),
                end: end.toISOString(),
                limit: 10
            }),
            fetchWhoopEndpoint(accessToken, '/v2/cycle', {
                start: start.toISOString(),
                end: end.toISOString(),
                limit: 10
            })
        ]);

        // Process and store metrics by date
        const metricsRef = admin.firestore()
            .collection('users')
            .doc(userId)
            .collection('metrics');

        const batch = admin.firestore().batch();

        // Process sleep data
        for (const sleep of (sleepData.records || [])) {
            const date = sleep.start?.split('T')[0];
            if (!date) continue;

            const docRef = metricsRef.doc(date);
            batch.set(docRef, {
                sleep_performance: sleep.score?.sleep_performance_percentage || null,
                sleep_duration_hours: sleep.score?.total_in_bed_time_milli
                    ? Math.round(sleep.score.total_in_bed_time_milli / 3600000 * 10) / 10
                    : null,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }

        // Process cycle data (strain AND recovery - v2 breaking change)
        // In v2, recovery data is embedded in cycle.recovery instead of separate endpoint
        for (const cycle of (cycleData.records || [])) {
            const date = cycle.start?.split('T')[0];
            if (!date) continue;

            const docRef = metricsRef.doc(date);
            const recovery = cycle.recovery || {}; // NEW: Extract recovery from cycle

            batch.set(docRef, {
                date,
                // Recovery data from cycle.recovery
                hrv: recovery.score?.hrv_rmssd_milli || null,
                resting_hr: recovery.score?.resting_heart_rate || null,
                recovery_score: recovery.score?.recovery_score || null,
                // Strain data from cycle.score
                strain: cycle.score?.strain || null,
                kilojoules: cycle.score?.kilojoule || null,
                avg_hr: cycle.score?.average_heart_rate || null,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }

        // Commit batch
        await batch.commit();

        // Calculate and update HRV baseline (30-day average)
        const thirtyDaysAgo = new Date(end - 30 * 24 * 60 * 60 * 1000);
        const metricsSnapshot = await metricsRef
            .where('date', '>=', thirtyDaysAgo.toISOString().split('T')[0])
            .orderBy('date', 'desc')
            .limit(30)
            .get();

        let hrvSum = 0;
        let hrvCount = 0;
        metricsSnapshot.forEach(doc => {
            const hrv = doc.data().hrv;
            if (hrv && hrv > 0) {
                hrvSum += hrv;
                hrvCount++;
            }
        });

        const hrvBaseline = hrvCount > 0 ? Math.round(hrvSum / hrvCount) : null;

        // Update user profile with baseline
        if (hrvBaseline) {
            await admin.firestore().collection('users').doc(userId).set({
                profile: {
                    hrv_baseline: hrvBaseline,
                    hrv_baseline_updated: admin.firestore.FieldValue.serverTimestamp()
                }
            }, { merge: true });
        }

        // Get latest metrics for immediate use
        const latestSleep = sleepData.records?.[0];
        const latestCycle = cycleData.records?.[0];
        const latestRecovery = latestCycle?.recovery; // NEW: Recovery from cycle in v2

        return {
            success: true,
            syncedRecords: (sleepData.records?.length || 0) + (cycleData.records?.length || 0),
            hrvBaseline,
            latest: {
                recoveryScore: latestRecovery?.score?.recovery_score || null,
                hrv: latestRecovery?.score?.hrv_rmssd_milli || null,
                restingHr: latestRecovery?.score?.resting_heart_rate || null,
                sleepPerformance: latestSleep?.score?.sleep_performance_percentage || null,
                strain: latestCycle?.score?.strain || null
            }
        };

    } catch (error) {
        console.error('Whoop sync error:', error);
        throw new HttpsError('internal', error.message || 'Failed to sync Whoop data.');
    }
});

/**
 * Get the latest Whoop metrics for a user.
 * Used by the adaptive engine.
 */
exports.getLatestWhoopMetrics = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const userId = request.auth.uid;

    try {
        // Get latest metrics from Firestore
        const metricsRef = admin.firestore()
            .collection('users')
            .doc(userId)
            .collection('metrics');

        const snapshot = await metricsRef
            .orderBy('date', 'desc')
            .limit(1)
            .get();

        if (snapshot.empty) {
            return { hasData: false };
        }

        const latestMetrics = snapshot.docs[0].data();

        // Get user's HRV baseline
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        const hrvBaseline = userDoc.data()?.profile?.hrv_baseline || 50;

        return {
            hasData: true,
            date: latestMetrics.date,
            recoveryScore: latestMetrics.recovery_score,
            hrv: latestMetrics.hrv,
            restingHr: latestMetrics.resting_hr,
            sleepPerformance: latestMetrics.sleep_performance,
            strain: latestMetrics.strain,
            hrvBaseline
        };

    } catch (error) {
        console.error('Get metrics error:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Get metrics history for charts.
 */
exports.getMetricsHistory = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }

    const userId = request.auth.uid;
    const { days = 7 } = request.data || {};

    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const metricsRef = admin.firestore()
            .collection('users')
            .doc(userId)
            .collection('metrics');

        const snapshot = await metricsRef
            .where('date', '>=', startDate.toISOString().split('T')[0])
            .orderBy('date', 'asc')
            .get();

        const history = [];
        snapshot.forEach(doc => {
            history.push({
                date: doc.id,
                ...doc.data()
            });
        });

        // Get baseline
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        const hrvBaseline = userDoc.data()?.profile?.hrv_baseline || 50;

        return {
            history,
            hrvBaseline,
            days
        };

    } catch (error) {
        console.error('Get history error:', error);
        throw new HttpsError('internal', error.message);
    }
});
