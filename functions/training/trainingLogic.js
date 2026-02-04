/**
 * trainingLogic.js
 * Core algorithm for generating periodized training plans.
 * Based on: algoritmeforslag.md - Hybrid Hyrox/Running periodization
 */

/**
 * Calculate training phases based on total preparation weeks.
 * @param {number} totalWeeks - Total weeks until race
 * @returns {Array<{name: string, duration: number, startWeek: number, endWeek: number}>}
 */
const calculatePhases = (totalWeeks) => {
    // Short Prep Protocol (<12 weeks)
    if (totalWeeks < 12) {
        const base = Math.round(totalWeeks * 0.2);
        const build = Math.round(totalWeeks * 0.5);
        const peak = Math.round(totalWeeks * 0.2);
        const taper = Math.max(1, totalWeeks - (base + build + peak));

        let currentWeek = 1;
        return [
            { name: 'base', duration: base, startWeek: currentWeek, endWeek: (currentWeek += base) - 1 },
            { name: 'build', duration: build, startWeek: currentWeek, endWeek: (currentWeek += build) - 1 },
            { name: 'peak', duration: peak, startWeek: currentWeek, endWeek: (currentWeek += peak) - 1 },
            { name: 'taper', duration: taper, startWeek: currentWeek, endWeek: (currentWeek += taper) - 1 }
        ];
    }

    // Standard Protocol (12+ weeks)
    const base = Math.round(totalWeeks * 0.45);
    const build = Math.round(totalWeeks * 0.35);
    const peak = Math.round(totalWeeks * 0.10);
    const taper = totalWeeks - (base + build + peak);

    let currentWeek = 1;
    return [
        { name: 'base', duration: base, startWeek: currentWeek, endWeek: (currentWeek += base) - 1 },
        { name: 'build', duration: build, startWeek: currentWeek, endWeek: (currentWeek += build) - 1 },
        { name: 'peak', duration: peak, startWeek: currentWeek, endWeek: (currentWeek += peak) - 1 },
        { name: 'taper', duration: taper, startWeek: currentWeek, endWeek: (currentWeek += taper) - 1 }
    ];
};

/**
 * Get the current phase for a given week number.
 * @param {number} weekNum - Current week number
 * @param {Array} phases - Array of phase objects
 * @returns {string} Phase name
 */
const getPhaseForWeek = (weekNum, phases) => {
    for (const phase of phases) {
        if (weekNum >= phase.startWeek && weekNum <= phase.endWeek) {
            return phase.name;
        }
    }
    return 'base'; // Fallback
};

/**
 * Calculate vertical target based on race profile.
 * @param {number} distKm - Planned distance for workout
 * @param {Object} goal - Race goal with race_dist_km and race_vert_m
 * @returns {number} Target elevation gain in meters
 */
const getVerticalTarget = (distKm, goal) => {
    if (!goal.race_dist_km || goal.race_dist_km === 0) return 0;
    const vertRatio = (goal.race_vert_m || 0) / goal.race_dist_km;
    return Math.round(distKm * vertRatio);
};

/**
 * Check if a week is a deload week.
 * @param {number} weekNum - Week number
 * @returns {boolean}
 */
const isDeloadWeek = (weekNum) => weekNum % 4 === 0;

/**
 * Generate a complete week plan.
 * @param {number} weekNum - Week number (1-indexed)
 * @param {string} phase - Current phase (base/build/peak/taper)
 * @param {Object} goal - Race goal object
 * @param {Object} preferences - User preferences (available days, session duration, etc.)
 * @returns {Array<Object>} Array of workout sessions
 */
const generateWeekPlan = (weekNum, phase, goal, preferences = {}) => {
    const isDeload = isDeloadWeek(weekNum);
    const volFactor = isDeload ? 0.6 : 1.0;

    // Taper phase has progressive reduction
    let taperFactor = 1.0;
    if (phase === 'taper') {
        // Reduce more as we get closer to race
        // First taper week: 70%, second: 50%, etc.
        const weeksInTaper = weekNum - (goal.total_weeks - 2); // Assuming 2-week taper
        taperFactor = Math.max(0.3, 1 - (weeksInTaper * 0.2));
    }

    // Progressive long run distance (Start 8km, +10% per week, cap at 120% race distance)
    let rawLongRunDist = 8 * Math.pow(1.1, weekNum - 1);
    rawLongRunDist = Math.min(rawLongRunDist, (goal.race_dist_km || 21) * 1.2);
    const longRunDist = Math.round(rawLongRunDist * volFactor * taperFactor);
    const easyRunDist = Math.round(longRunDist * 0.5);

    // Get vertical targets
    const longRunVert = getVerticalTarget(longRunDist, goal);

    const weekPlan = [];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    days.forEach(day => {
        let workout = {
            day,
            type: 'rest',
            subtype: 'recovery',
            title: 'Hviledag',
            description: 'Aktiv restitusjon eller total hvile.',
            duration_minutes: 0,
            details: {
                intensity_zone: 0
            }
        };

        switch (day) {
            case 'monday':
                workout.title = 'Mobilitet / Hvile';
                workout.description = 'Mobilitet, skumrulling, eller total hvile.';
                workout.type = 'rest';
                workout.subtype = 'mobility';
                break;

            case 'tuesday':
                workout.type = 'run';
                if (phase === 'base') {
                    workout.subtype = 'intervals_aerobic';
                    workout.title = 'Aerobe intervaller';
                    workout.description = '4 x 8 min i Sone 3 med 2 min rolig mellom.';
                    workout.duration_minutes = Math.round(60 * volFactor);
                    workout.details = {
                        intensity_zone: 3,
                        intervals: '4 x 8 min @ Z3',
                        purpose: 'Bygge aerob kapasitet'
                    };
                } else if (phase === 'build') {
                    workout.subtype = 'threshold';
                    workout.title = 'Terskeltrening';
                    workout.description = '3 x 10 min i terskelfart (Sone 4).';
                    workout.duration_minutes = Math.round(60 * volFactor);
                    workout.details = {
                        intensity_zone: 4,
                        intervals: '3 x 10 min @ Z4',
                        purpose: 'Heve laktatterskelen'
                    };
                } else if (phase === 'peak') {
                    workout.subtype = 'vo2max';
                    workout.title = 'VO2max intervaller';
                    workout.description = '10 x 400m med maksimal innsats.';
                    workout.duration_minutes = Math.round(50 * volFactor);
                    workout.details = {
                        intensity_zone: 5,
                        intervals: '10 x 400m @ max',
                        purpose: 'Toppe VO2max'
                    };
                } else { // taper
                    workout.subtype = 'easy';
                    workout.title = 'Lett løp';
                    workout.description = 'Lett løp i Sone 2. Hold deg frisk!';
                    workout.duration_minutes = Math.round(30 * taperFactor);
                    workout.details = {
                        intensity_zone: 2,
                        purpose: 'Vedlikehold før konkurranse'
                    };
                }
                break;

            case 'wednesday':
                if (phase === 'taper') {
                    workout.type = 'rest';
                    workout.title = 'Hvile';
                    workout.description = 'Hviledag for optimal restitusjon.';
                } else {
                    workout.type = 'hyrox';
                    workout.subtype = 'strength';
                    workout.title = 'Hyrox Styrke';
                    workout.description = 'Fokus på Sled Push/Pull, Wall Balls, Farmers Carry.';
                    workout.duration_minutes = Math.round(75 * volFactor);
                    workout.details = {
                        intensity_zone: 4,
                        exercises: ['Sled Push', 'Sled Pull', 'Wall Balls', 'Farmers Carry', 'Lunges'],
                        format: 'Strength focus',
                        purpose: 'Bygge Hyrox-spesifikk styrke'
                    };
                }
                break;

            case 'thursday':
                workout.type = 'run';
                workout.subtype = 'easy';
                workout.title = 'Restitusjonsløp';
                workout.description = `${easyRunDist} km i lett, behagelig tempo (Sone 2).`;
                workout.duration_minutes = Math.round(45 * volFactor * taperFactor);
                workout.details = {
                    distance_km: easyRunDist,
                    intensity_zone: 2,
                    purpose: 'Aktiv restitusjon'
                };
                break;

            case 'friday':
                if (isDeload || phase === 'taper') {
                    workout.type = 'rest';
                    workout.title = 'Hvile';
                    workout.description = 'Hviledag.';
                } else {
                    workout.type = 'hyrox';
                    workout.subtype = 'metcon';
                    workout.title = 'Hyrox Metcon';
                    workout.description = 'Høyintensitets sirkeltrening med Hyrox-bevegelser.';
                    workout.duration_minutes = Math.round(60 * volFactor);
                    workout.details = {
                        intensity_zone: 5,
                        exercises: ['SkiErg', 'Burpee Broad Jump', 'Rowing', 'Box Jumps'],
                        format: 'AMRAP eller For Time',
                        purpose: 'Race-simulering og kondisjon'
                    };
                }
                break;

            case 'saturday':
                workout.type = 'rest';
                workout.subtype = 'active_recovery';
                workout.title = 'Aktiv hvile';
                workout.description = 'Lett aktivitet: gåtur, svømming, yoga.';
                workout.duration_minutes = 30;
                workout.details = {
                    intensity_zone: 1,
                    purpose: 'Aktiv restitusjon før langtur'
                };
                break;

            case 'sunday':
                workout.type = 'run';
                workout.subtype = 'long_run';
                workout.title = 'Langtur';
                workout.description = `${longRunDist} km i prate-tempo (Sone 2).${longRunVert > 0 ? ` Mål: ${longRunVert}m stigning.` : ''}`;
                workout.duration_minutes = Math.round((longRunDist * 6) * volFactor * taperFactor); // ~6 min/km
                workout.details = {
                    distance_km: longRunDist,
                    vert_m: longRunVert,
                    intensity_zone: 2,
                    purpose: 'Bygge aerob utholdenhet og mental styrke'
                };
                break;
        }

        // Add metadata
        workout.week_number = weekNum;
        workout.phase = phase;
        workout.is_deload = isDeload;

        weekPlan.push(workout);
    });

    return weekPlan;
};

/**
 * Generate a complete multi-week training plan.
 * @param {Object} goal - Race goal object
 * @param {Object} preferences - User preferences
 * @returns {Object} Complete plan with all weeks
 */
const generateFullPlan = (goal, preferences = {}) => {
    const totalWeeks = goal.total_weeks || 12;
    const phases = calculatePhases(totalWeeks);

    // Calculate week start dates
    const raceDate = goal.race_date ? new Date(goal.race_date) : new Date();
    const planStartDate = new Date(raceDate);
    planStartDate.setDate(planStartDate.getDate() - (totalWeeks * 7));

    // Adjust to Monday
    const dayOfWeek = planStartDate.getDay();
    const daysToMonday = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 8 - dayOfWeek);
    planStartDate.setDate(planStartDate.getDate() + daysToMonday);

    const weeks = [];
    for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
        const phase = getPhaseForWeek(weekNum, phases);
        const sessions = generateWeekPlan(weekNum, phase, goal, preferences);

        // Calculate week start date
        const weekStartDate = new Date(planStartDate);
        weekStartDate.setDate(weekStartDate.getDate() + ((weekNum - 1) * 7));

        // Calculate totals
        const runSessions = sessions.filter(s => s.type === 'run');
        const totalRunKm = runSessions.reduce((sum, s) => sum + (s.details?.distance_km || 0), 0);
        const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
        const strengthSessions = sessions.filter(s => s.type === 'hyrox' || s.type === 'strength').length;

        weeks.push({
            weekNumber: weekNum,
            weekStartDate: weekStartDate.toISOString().split('T')[0],
            phase,
            isDeload: isDeloadWeek(weekNum),
            focus: getWeekFocus(weekNum, phase, isDeloadWeek(weekNum)),
            totalLoad: {
                running_km: totalRunKm,
                strength_sessions: strengthSessions,
                estimated_hours: Math.round(totalMinutes / 60 * 10) / 10
            },
            sessions
        });
    }

    return {
        planId: `plan_${Date.now()}`,
        createdAt: new Date().toISOString(),
        goal: {
            raceName: goal.race_name,
            raceDate: goal.race_date,
            raceDistanceKm: goal.race_dist_km,
            raceVertM: goal.race_vert_m,
            totalWeeks
        },
        phases,
        weeks,
        overallStrategy: generateOverallStrategy(goal, phases)
    };
};

/**
 * Get focus description for a week.
 */
const getWeekFocus = (weekNum, phase, isDeload) => {
    if (isDeload) {
        return 'Deload-uke: Redusert volum for restitusjon og tilpasning.';
    }

    switch (phase) {
        case 'base':
            return 'Base: Bygg aerob grunnlag med høyt volum og lav intensitet.';
        case 'build':
            return 'Build: Øk intensitet med terskel- og tempoarbeid.';
        case 'peak':
            return 'Peak: Maksimal spesifikk trening for å toppe formen.';
        case 'taper':
            return 'Taper: Reduser volum, behold intensitet. Hvile er trening!';
        default:
            return 'Generell trening.';
    }
};

/**
 * Generate overall strategy description.
 */
const generateOverallStrategy = (goal, phases) => {
    const basePhase = phases.find(p => p.name === 'base');
    const buildPhase = phases.find(p => p.name === 'build');
    const peakPhase = phases.find(p => p.name === 'peak');
    const taperPhase = phases.find(p => p.name === 'taper');

    return `Periodisert ${goal.total_weeks}-ukers plan mot ${goal.race_name || 'konkurransen'} (${goal.race_dist_km}km). ` +
        `Base (uke 1-${basePhase?.endWeek || '?'}): Bygg volum. ` +
        `Build (uke ${buildPhase?.startWeek || '?'}-${buildPhase?.endWeek || '?'}): Intensitet. ` +
        `Peak (uke ${peakPhase?.startWeek || '?'}-${peakPhase?.endWeek || '?'}): Topping. ` +
        `Taper (uke ${taperPhase?.startWeek || '?'}-${taperPhase?.endWeek || '?'}): Hvile for race day.`;
};

module.exports = {
    calculatePhases,
    getPhaseForWeek,
    getVerticalTarget,
    isDeloadWeek,
    generateWeekPlan,
    generateFullPlan
};
