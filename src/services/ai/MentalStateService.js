/**
 * MentalStateService.js
 * Implements a simplified BDI (Belief-Desire-Intention) model for the AI Coach.
 */

class MentalStateService {
    constructor() {
        this.beliefs = {};
        this.desires = [];
        this.intentions = [];
    }

    /**
     * Main entry point to assess the user's situation.
     * @param {Object} context - { recentWorkouts, stats, currentPlan, userGoals }
     * @returns {Object} A snapshot of the mental state (beliefs, desires, intentions)
     */
    assessSituation(context) {
        this.updateBeliefs(context);
        this.updateDesires();
        this.updateIntentions();

        return {
            beliefs: { ...this.beliefs },
            desires: [...this.desires],
            intentions: [...this.intentions],
            primaryIntention: this.intentions[0] || null,
            advice: this.generateAdvice()
        };
    }

    // --- 1. BELIEFS: What is true about the world/user? ---
    updateBeliefs({ stats, recentWorkouts, currentPlan, goals, whoop, currentPhase }) {
        const { acuteLoad, chronicLoad, totalWorkouts } = stats;

        // Calculate Fatigue/Load Ratio (simplified TSB - Training Stress Balance)
        const loadRatio = chronicLoad > 0 ? acuteLoad / chronicLoad : 0; // > 1.3 is warning zone

        // Determine consistency (last 7 days)
        const workoutsLastWeek = recentWorkouts.filter(w => {
            const diff = new Date() - new Date(w.date);
            return diff < 7 * 24 * 60 * 60 * 1000;
        }).length;

        // Calculate Adherence
        let adherence = 0.8;
        if (currentPlan && currentPlan.sessions) {
            const completed = currentPlan.sessions.filter(s => s.completed).length;
            const total = currentPlan.sessions.length;
            if (total > 0) adherence = completed / total;
        }

        // Check for upcoming race
        const hasUpcomingRace = goals ? goals.some(g => {
            if (g.type !== 'race' || !g.date) return false;
            const daysUntil = (new Date(g.date) - new Date()) / (1000 * 60 * 60 * 24);
            return daysUntil >= 0 && daysUntil <= 14;
        }) : false;

        // -- WHOOP ANALYSIS --
        let whoopState = {
            hasPoorRecovery: false,
            hasGoodRecovery: false,
            hasPoorSleep: false,
            strainHigh: false
        };

        if (whoop) {
            // Recovery (0-100)
            const recovery = whoop.recoveryScore || 0;
            whoopState.hasPoorRecovery = recovery < 33;
            whoopState.hasGoodRecovery = recovery > 66;

            // Sleep Performance (0-100)
            const sleep = whoop.sleepPerformance || 0;
            whoopState.hasPoorSleep = sleep < 70;

            // High strain warning
            whoopState.strainHigh = (whoop.strain || 0) > 18;
        }

        // -- PHASE AWARENESS --
        // Training phases affect how we interpret other signals
        const phaseState = {
            inBasePhase: currentPhase === 'base',
            inBuildPhase: currentPhase === 'build',
            inPeakPhase: currentPhase === 'peak',
            inTaperPhase: currentPhase === 'taper'
        };

        this.beliefs = {
            hasHighFatigue: loadRatio > 1.3,
            hasLowFatigue: loadRatio < 0.8,
            isConsistent: workoutsLastWeek >= 3,
            isOverTraining: loadRatio > 1.5,
            isReturningFromBreak: totalWorkouts > 0 && workoutsLastWeek === 0,
            hasUpcomingRace: hasUpcomingRace,
            hasLowAdherence: adherence < 0.5,
            currentPhase: currentPhase || null,
            ...whoopState,
            ...phaseState
        };
    }

    // --- 2. DESIRES: What do we want to achieve? ---
    updateDesires() {
        this.desires = [];

        // Hierarchy of Needs

        // 1. Safety / Physical State (Highest Priority)
        // If Whoop says you're wrecked, listen to it regardless of training load
        if (this.beliefs.hasPoorRecovery || this.beliefs.isOverTraining) {
            this.desires.push('Deep Recovery'); // Stronger than just "Prevent Injury"
        } else if (this.beliefs.hasHighFatigue || this.beliefs.hasPoorSleep) {
            this.desires.push('Prevent Injury');
            this.desires.push('Reduce Fatigue');
        }

        // 2. Phase-specific desires
        if (this.beliefs.inTaperPhase) {
            // In taper, we ALWAYS prioritize rest even if recovery is green
            this.desires.push('Prepare for Race');
            this.desires.push('Maintain Sharpness');
            // Remove any push desires
        } else if (this.beliefs.hasUpcomingRace) {
            this.desires.push('Prepare for Race');
        } else if (this.beliefs.inPeakPhase) {
            // Peak phase: higher tolerance for fatigue
            if (!this.beliefs.hasPoorRecovery) {
                this.desires.push('Maximize Performance');
            }
        } else if (this.beliefs.inBuildPhase) {
            // Build phase: push intensity when recovered
            if (this.beliefs.hasGoodRecovery) {
                this.desires.push('Build Intensity');
            }
        }

        // 3. Consistency (not during taper)
        if (!this.beliefs.isConsistent && !this.beliefs.hasHighFatigue &&
            !this.beliefs.hasPoorRecovery && !this.beliefs.inTaperPhase) {
            this.desires.push('Re-establish Routine');
        }

        // 4. Performance (not during taper)
        // If we have Good Recovery, we WANT to push
        if ((this.beliefs.isConsistent || this.beliefs.hasGoodRecovery) &&
            !this.beliefs.hasHighFatigue && !this.beliefs.inTaperPhase) {
            this.desires.push('Improve Fitness');
            this.desires.push('Maintain Adherence');
        }

        // Fallback
        if (this.desires.length === 0) {
            this.desires.push('Stay Active');
        }
    }

    // --- 3. INTENTIONS: What are we going to do about it? ---
    updateIntentions() {
        this.intentions = [];

        // Map Desires to Actionable Intentions
        this.desires.forEach(desire => {
            switch (desire) {
                case 'Deep Recovery':
                    this.intentions.push({ type: 'REST_URGENT', label: 'Rest Day Needed', phase: this.beliefs.currentPhase });
                    break;
                case 'Prevent Injury':
                case 'Reduce Fatigue':
                    this.intentions.push({ type: 'REST', label: 'Suggest Recovery', phase: this.beliefs.currentPhase });
                    break;
                case 'Prepare for Race':
                    this.intentions.push({ type: 'TAPER', label: 'Race Prep Mode', phase: this.beliefs.currentPhase });
                    break;
                case 'Maintain Sharpness':
                    this.intentions.push({ type: 'SHARPEN', label: 'Stay Sharp', phase: 'taper' });
                    break;
                case 'Maximize Performance':
                    this.intentions.push({ type: 'PEAK_PUSH', label: 'Peak Performance', phase: 'peak' });
                    break;
                case 'Build Intensity':
                    this.intentions.push({ type: 'BUILD', label: 'Build Phase', phase: 'build' });
                    break;
                case 'Re-establish Routine':
                    this.intentions.push({ type: 'MOTIVATE', label: 'Encourage Small Step', phase: this.beliefs.currentPhase });
                    break;
                case 'Improve Fitness':
                    // If good recovery, suggest intensity
                    if (this.beliefs.hasGoodRecovery) {
                        this.intentions.push({ type: 'PUSH_HARD', label: 'Optimize Intensity', phase: this.beliefs.currentPhase });
                    } else {
                        this.intentions.push({ type: 'PUSH', label: 'Build Fitness', phase: this.beliefs.currentPhase });
                    }
                    break;
                case 'Stay Active':
                default:
                    this.intentions.push({ type: 'MAINTAIN', label: 'Keep Going', phase: this.beliefs.currentPhase });
                    break;
            }
        });
    }

    // Generate human-readable advice
    generateAdvice() {
        // Prioritize the top intention
        const primary = this.intentions[0];
        if (!primary) return "Hold oversikt over treningene dine!";

        const { hasPoorRecovery, hasPoorSleep, hasGoodRecovery, currentPhase, strainHigh } = this.beliefs;

        switch (primary.type) {
            case 'REST_URGENT':
                if (hasPoorRecovery) return "Whoop viser kritisk lav restitusjon. Ta en fullstendig hviledag for å komme tilbake sterkere.";
                return "Kroppen din viser tegn på overtrening. Hvile er dagens viktigste trening.";
            case 'REST':
                if (hasPoorSleep) return "Søvnytelsen har vært lav. Vurder en lettere økt eller tidlig kveld.";
                if (strainHigh) return "Høy akkumulert belastning. En rolig restitusjonøkt er bedre enn å presse i dag.";
                return "Tretthet bygger seg opp. En lett restitusjonøkt gir mer enn å slite seg ut i dag.";
            case 'TAPER':
                return "Konkurransedagen nærmer seg! Fokuser på søvn og lette detaljer. Stol på treningen du har lagt ned.";
            case 'SHARPEN':
                return "Taper-fase: Hold deg skarp med korte, raske intervaller. Volum ned, kvalitet opp.";
            case 'PEAK_PUSH':
                return "Peak-fase: Nå gjelder det! Høy intensitet i dag for å toppe formen.";
            case 'BUILD':
                return "Build-fase: Tid for å øke intensiteten. Terskler og tempoarbeid bygger fart.";
            case 'MOTIVATE':
                return "Det har vært en rolig uke. La oss prøve å få inn bare 20 minutter i dag for å komme i gang igjen!";
            case 'PUSH_HARD':
                if (hasGoodRecovery) return "Du er i toppform (Grønn Recovery)! Dette er dagen for det harde intervallpasset.";
                return "Restitusjon er bra. Gi gass i dag!";
            case 'PUSH':
                return "Bra konsistens. Du bygger solid form. Hold deg til planen.";
            case 'MAINTAIN':
            default:
                return "Du gjør det bra. Jevn progresjon er målet.";
        }
    }

    // Get phase-specific context for AI chat
    getPhaseContext() {
        const phase = this.beliefs.currentPhase;
        if (!phase) return null;

        const phaseDescriptions = {
            base: 'Base-fase: Fokus på aerob grunnlag med høyt volum og lav intensitet. 80/20-prinsippet gjelder.',
            build: 'Build-fase: Økende intensitet med terskel- og tempoarbeid. Fortsatt respekter restitusjon.',
            peak: 'Peak-fase: Maksimal spesifikk trening. Høy belastning, men lytt til kroppen.',
            taper: 'Taper-fase: Volum ned 30-50%, behold intensitet. Hvile er like viktig som trening nå.'
        };

        return {
            phase,
            description: phaseDescriptions[phase] || 'Generell treningsperiode.'
        };
    }
}

export const aiMentalModel = new MentalStateService();
