/**
 * DataHubService.js
 * Centralized service for aggregating data from external sources.
 * Integrates:
 * 1. Weather (Yr.no via Met.no API)
 * 2. Strava (via Activity stats)
 * 3. Health Data (Mocked/Future integration)
 */

const MET_API_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';

export const DataHubService = {

    /**
     * Fetch weather data for a specific location
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     */
    async getWeather(lat = 59.91, lon = 10.75) { // Default: Oslo
        try {
            // Must include User-Agent for Met.no API
            const response = await fetch(`${MET_API_URL}?lat=${lat}&lon=${lon}`, {
                headers: {
                    'User-Agent': 'SmartTrainingPlanner/1.0',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Weather fetch failed');
            const data = await response.json();

            // Simplify data for the dashboard
            const current = data.properties.timeseries[0].data.instant.details;
            const nextHour = data.properties.timeseries[0].data.next_1_hours?.summary?.symbol_code;

            return {
                temp: current.air_temperature,
                wind: current.wind_speed,
                precip: nextHour, // symbol code like 'rain', 'partlycloudy_day'
                updatedAt: new Date()
            };
        } catch (error) {
            console.warn('Weather API Error:', error);
            return null;
        }
    },

    /**
     * Aggregate internal training stats for the Data Hub
     * @param {Array} workouts 
     */
    calculateTrainingLoad(workouts) {
        if (!workouts || workouts.length === 0) return { weeklyVolume: 0, fatigue: 0 };

        // Simple load calc (Duration * RPE)
        const now = new Date();
        const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

        const recent = workouts.filter(w => new Date(w.date) > oneWeekAgo);
        const volume = recent.reduce((sum, w) => sum + (w.duration || 0), 0) / 60; // hours

        // Mock Readiness Score (0-100)
        // In real app, this comes from HRV or intricate load logic (ACWR)
        const readiness = Math.max(0, 100 - (volume * 5));

        return {
            weeklyVolume: volume.toFixed(1),
            readiness: Math.round(readiness),
            sessionCount: recent.length
        };
    },

    /**
     * Mock Health Data (Apple Health / Garmin Connect equivalent)
     */
    getHealthMetrics() {
        return {
            sleepScore: 85, // Mock
            restingHR: 52, // Mock
            steps: 8432, // Mock for today
            hrv: 65 // Mock ms
        };
    }
};
