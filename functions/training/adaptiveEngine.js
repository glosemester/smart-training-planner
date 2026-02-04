/**
 * adaptiveEngine.js
 * HRV-based workout adjustment using Whoop data.
 * Adjusts today's planned workout based on recovery status.
 */

/**
 * Recovery thresholds based on Whoop scores (0-100)
 */
const RECOVERY_THRESHOLDS = {
    CRITICAL: 33,    // Red zone - need rest
    WARNING: 50,     // Yellow zone - reduce intensity
    OPTIMAL: 67,     // Green zone - can push
    PRIME: 85        // Peak performance day
};

/**
 * Sleep performance thresholds
 */
const SLEEP_THRESHOLDS = {
    POOR: 60,
    MODERATE: 75,
    GOOD: 85
};

/**
 * Analyze Whoop metrics and determine adjustment strategy.
 * @param {Object} whoopData - Current Whoop data
 * @param {number} hrvBaseline - User's 30-day HRV average
 * @returns {Object} Analysis result with adjustment recommendations
 */
const analyzeRecoveryStatus = (whoopData, hrvBaseline = 50) => {
    const {
        recoveryScore = 50,
        hrv = hrvBaseline,
        restingHr = 55,
        sleepPerformance = 75,
        strain = 0
    } = whoopData;

    // Calculate HRV deviation from baseline
    const hrvDeviation = hrvBaseline > 0 ? ((hrv - hrvBaseline) / hrvBaseline) * 100 : 0;

    // Determine recovery status
    let status = 'normal';
    let adjustmentFactor = 1.0;
    let recommendation = '';

    if (recoveryScore < RECOVERY_THRESHOLDS.CRITICAL) {
        status = 'critical';
        adjustmentFactor = 0.3; // 70% reduction
        recommendation = 'Din kropp trenger hvile. Vurder total hviledag eller lett mobilitet.';
    } else if (recoveryScore < RECOVERY_THRESHOLDS.WARNING) {
        status = 'warning';
        adjustmentFactor = 0.6; // 40% reduction
        recommendation = 'Redusert restitusjon. Kjør lettere enn planlagt i dag.';
    } else if (recoveryScore < RECOVERY_THRESHOLDS.OPTIMAL) {
        status = 'moderate';
        adjustmentFactor = 0.85; // 15% reduction
        recommendation = 'OK restitusjon. Følg planen, men lytt til kroppen.';
    } else if (recoveryScore >= RECOVERY_THRESHOLDS.PRIME) {
        status = 'prime';
        adjustmentFactor = 1.1; // 10% boost allowed
        recommendation = 'Topp restitusjon! Dette er dagen for å pushe!';
    } else {
        status = 'good';
        adjustmentFactor = 1.0;
        recommendation = 'God restitusjon. Kjør som planlagt.';
    }

    // Adjust based on sleep
    if (sleepPerformance < SLEEP_THRESHOLDS.POOR) {
        adjustmentFactor *= 0.85;
        recommendation += ' Dårlig søvn - vær ekstra forsiktig.';
    }

    // Adjust based on HRV deviation
    if (hrvDeviation < -15) {
        adjustmentFactor *= 0.9;
        recommendation += ' HRV under baseline - kroppen er under stress.';
    } else if (hrvDeviation > 10) {
        adjustmentFactor = Math.min(adjustmentFactor * 1.05, 1.15);
    }

    // Check for accumulated strain
    if (strain > 18) {
        adjustmentFactor *= 0.9;
        recommendation += ' Høy akkumulert strain - prioriter restitusjon.';
    }

    return {
        status,
        recoveryScore,
        hrvDeviation: Math.round(hrvDeviation),
        adjustmentFactor: Math.round(adjustmentFactor * 100) / 100,
        recommendation,
        metrics: {
            hrv,
            hrvBaseline,
            restingHr,
            sleepPerformance,
            strain
        }
    };
};

/**
 * Adjust a workout based on recovery analysis.
 * @param {Object} workout - Planned workout
 * @param {Object} analysis - Recovery analysis from analyzeRecoveryStatus
 * @returns {Object} Adjusted workout
 */
const adjustWorkout = (workout, analysis) => {
    const { adjustmentFactor, status } = analysis;

    // Clone workout to avoid mutation
    const adjusted = JSON.parse(JSON.stringify(workout));

    // Mark as adjusted
    adjusted.is_adjusted = true;
    adjusted.adjustment_reason = analysis.recommendation;
    adjusted.original_workout = {
        duration_minutes: workout.duration_minutes,
        type: workout.type,
        subtype: workout.subtype,
        details: { ...workout.details }
    };

    // Critical status - convert to rest
    if (status === 'critical') {
        adjusted.type = 'rest';
        adjusted.subtype = 'recovery_mandatory';
        adjusted.title = 'Hviledag (justert fra Whoop)';
        adjusted.description = 'Din Whoop viser kritisk lav restitusjon. I dag er hvile den beste treningen.';
        adjusted.duration_minutes = 0;
        adjusted.details = {
            intensity_zone: 0,
            original_type: workout.type,
            adjustment_type: 'converted_to_rest'
        };
        return adjusted;
    }

    // Adjust duration
    adjusted.duration_minutes = Math.round(workout.duration_minutes * adjustmentFactor);

    // Adjust distance if applicable
    if (adjusted.details?.distance_km) {
        adjusted.details.distance_km = Math.round(adjusted.details.distance_km * adjustmentFactor * 10) / 10;
    }

    // Adjust intensity zone for warning status
    if (status === 'warning' && adjusted.details?.intensity_zone > 2) {
        adjusted.details.intensity_zone = Math.max(2, adjusted.details.intensity_zone - 1);
        adjusted.description = `[Justert] ${adjusted.description} Senk intensiteten til Sone ${adjusted.details.intensity_zone}.`;
    }

    // Handle intervals - reduce reps or intensity
    if (adjusted.details?.intervals && status !== 'good' && status !== 'prime') {
        // Simple reduction: reduce by factor
        const intervalMatch = adjusted.details.intervals.match(/(\d+)\s*x/);
        if (intervalMatch) {
            const originalReps = parseInt(intervalMatch[1]);
            const newReps = Math.max(2, Math.round(originalReps * adjustmentFactor));
            adjusted.details.intervals = adjusted.details.intervals.replace(
                `${originalReps} x`,
                `${newReps} x`
            );
        }
    }

    // Prime status - allow intensity boost
    if (status === 'prime' && adjusted.details?.intensity_zone) {
        adjusted.title = `[Grønt lys] ${adjusted.title}`;
        adjusted.description = `${adjusted.description} Du er i toppform - gi alt!`;
    }

    return adjusted;
};

/**
 * Calculate user's HRV baseline from historical data.
 * @param {Array} metrics - Array of daily metrics (last 30 days)
 * @returns {number} Baseline HRV
 */
const calculateHrvBaseline = (metrics) => {
    if (!metrics || metrics.length === 0) return 50; // Default

    // Use only days with valid HRV
    const validMetrics = metrics.filter(m => m.hrv && m.hrv > 0);
    if (validMetrics.length === 0) return 50;

    // Calculate 30-day rolling average
    const recentMetrics = validMetrics.slice(0, 30);
    const sum = recentMetrics.reduce((acc, m) => acc + m.hrv, 0);
    return Math.round(sum / recentMetrics.length);
};

/**
 * Calculate acute vs chronic load ratio (simplified TSB).
 * @param {Array} workouts - Recent workouts with load_score
 * @returns {Object} Load metrics
 */
const calculateLoadMetrics = (workouts) => {
    if (!workouts || workouts.length === 0) {
        return { acuteLoad: 0, chronicLoad: 0, ratio: 0, status: 'unknown' };
    }

    const now = new Date();
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const fourWeeksAgo = new Date(now - 28 * 24 * 60 * 60 * 1000);

    // Acute load (last 7 days)
    const acuteWorkouts = workouts.filter(w => new Date(w.date) >= oneWeekAgo);
    const acuteLoad = acuteWorkouts.reduce((sum, w) => sum + (w.actual?.load_score || 0), 0);

    // Chronic load (last 28 days, weekly average)
    const chronicWorkouts = workouts.filter(w => new Date(w.date) >= fourWeeksAgo);
    const chronicLoad = chronicWorkouts.reduce((sum, w) => sum + (w.actual?.load_score || 0), 0) / 4;

    const ratio = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;

    let status = 'optimal';
    if (ratio > 1.5) status = 'overreaching';
    else if (ratio > 1.3) status = 'high';
    else if (ratio < 0.8) status = 'detraining';

    return {
        acuteLoad: Math.round(acuteLoad),
        chronicLoad: Math.round(chronicLoad),
        ratio: Math.round(ratio * 100) / 100,
        status
    };
};

/**
 * Generate daily training recommendation based on all available data.
 * @param {Object} params - { whoopData, hrvBaseline, todaysWorkout, recentWorkouts, currentPhase }
 * @returns {Object} Daily recommendation
 */
const generateDailyRecommendation = ({
    whoopData,
    hrvBaseline,
    todaysWorkout,
    recentWorkouts,
    currentPhase
}) => {
    // Analyze recovery
    const recoveryAnalysis = analyzeRecoveryStatus(whoopData, hrvBaseline);

    // Calculate load metrics
    const loadMetrics = calculateLoadMetrics(recentWorkouts);

    // Adjust today's workout if needed
    let adjustedWorkout = null;
    if (todaysWorkout && todaysWorkout.type !== 'rest') {
        adjustedWorkout = adjustWorkout(todaysWorkout, recoveryAnalysis);
    }

    // Phase-specific adjustments
    let phaseAdjustment = null;
    if (currentPhase === 'taper' && recoveryAnalysis.status === 'prime') {
        phaseAdjustment = 'I taper-fasen holder vi igjen selv på grønne dager. Stol på treningen!';
    } else if (currentPhase === 'peak' && recoveryAnalysis.status === 'warning') {
        phaseAdjustment = 'Peak-fase med lav restitusjon. Vurder om vi skal skyve på nøkkeløkter.';
    }

    return {
        date: new Date().toISOString().split('T')[0],
        recovery: recoveryAnalysis,
        load: loadMetrics,
        phase: currentPhase,
        phaseAdjustment,
        originalWorkout: todaysWorkout,
        adjustedWorkout,
        shouldAdjust: adjustedWorkout?.is_adjusted || false,
        overallRecommendation: generateOverallRecommendation(recoveryAnalysis, loadMetrics, currentPhase)
    };
};

/**
 * Generate overall recommendation text.
 */
const generateOverallRecommendation = (recovery, load, phase) => {
    const parts = [];

    // Recovery-based
    parts.push(recovery.recommendation);

    // Load-based
    if (load.status === 'overreaching') {
        parts.push('Treningsbelastningen er veldig høy. Vurder ekstra hvile de neste dagene.');
    } else if (load.status === 'detraining') {
        parts.push('Treningsbelastningen har vært lav. La oss komme i gang igjen!');
    }

    // Phase-based
    if (phase === 'taper') {
        parts.push('Husk: I taper-fasen er mindre mer. Stol på jobben du har lagt ned!');
    }

    return parts.join(' ');
};

module.exports = {
    RECOVERY_THRESHOLDS,
    SLEEP_THRESHOLDS,
    analyzeRecoveryStatus,
    adjustWorkout,
    calculateHrvBaseline,
    calculateLoadMetrics,
    generateDailyRecommendation
};
