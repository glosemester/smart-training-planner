import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';

const PROJECT_ID = "smart-training-app-8bed1"; // From your project config
const REGION = "us-central1"; // Default Firebase region
const FUNCTIONS_BASE = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net`;

const functions = getFunctions();
const getWhoopAuthUrl = httpsCallable(functions, 'getWhoopAuthUrl');
const exchangeWhoopToken = httpsCallable(functions, 'exchangeWhoopToken');
const fetchWhoopProxy = httpsCallable(functions, 'fetchWhoopData');

export const WhoopService = {
    /**
     * Redirects the user to the Whoop OAuth flow.
     */
    connect: async () => {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
            console.error("No user logged in, cannot connect to Whoop.");
            return;
        }

        try {
            const result = await getWhoopAuthUrl();
            const { url } = result.data;
            if (url) {
                window.location.href = url;
            }
        } catch (error) {
            console.error("Failed to initiate Whoop login:", error);
            throw error;
        }
    },

    /**
     * Completes login by exchanging code for token.
     */
    completeLogin: async (code, state) => {
        try {
            const result = await exchangeWhoopToken({ code, state });
            return result.data;
        } catch (error) {
            console.error("Failed to exchange Whoop token:", error);
            throw error;
        }
    },

    /**
     * Generic fetcher via backend proxy.
     */
    fetchData: async (endpoint, params = {}) => {
        try {
            const result = await fetchWhoopProxy({ endpoint, params });
            return result.data;
        } catch (error) {
            console.error(`Whoop Service Error (${endpoint}):`, error);
            throw error;
        }
    },

    /**
     * Get Recovery data (Whoop v2 - embedded in Cycle)
     * In v2, recovery is no longer a separate endpoint
     * Contains HRV, resting HR, and recovery score
     */
    getRecovery: async (start, end) => {
        // v2: Recovery embedded in cycle data
        const cycles = await WhoopService.fetchData('/v2/cycle', { start, end, limit: 25 });
        // Extract recovery from cycles
        return {
            records: cycles.records?.map(c => c.recovery).filter(Boolean) || []
        };
    },

    /**
     * Get Sleep data (Whoop "Sleep" endpoint)
     * Contains sleep performance, duration, stages
     */
    getSleep: async (start, end) => {
        return await WhoopService.fetchData('/v2/activity/sleep', { start, end, limit: 25 });
    },

    /**
     * Get Cycle data (Whoop "Cycle" endpoint - physiological cycles with strain)
     */
    getCycles: async (start, end) => {
        return await WhoopService.fetchData('/v2/cycle', { start, end, limit: 25 });
    },

    /**
     * Get data for a specific date range (e.g., current week)
     */
    getWeeklySummary: async () => {
        // Calculate start of week (last 7 days for Whoop context)
        // Whoop dates are ISO strings.
        const end = new Date().toISOString();
        const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        // Parallel fetch for efficiency
        // Using Whoop API v2 endpoints (v1 deprecated Oct 2025)
        const [cycles, sleep] = await Promise.all([
            WhoopService.fetchData('/v2/cycle', { start, end, limit: 10 }),
            WhoopService.fetchData('/v2/activity/sleep', { start, end, limit: 10 })
        ]);

        // Extract recovery from cycles (v2 breaking change)
        const recovery = {
            records: cycles.records?.map(c => c.recovery).filter(Boolean) || []
        };

        return { cycles, recovery, sleep };
    }
};
