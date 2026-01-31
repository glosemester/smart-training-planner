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
    updateBeliefs({ stats, recentWorkouts, currentPlan, goals }) {
        const { acuteLoad, chronicLoad, totalWorkouts } = stats;

        // Calculate Fatigue/Load Ratio (simplified TSB - Training Stress Balance)
        const loadRatio = chronicLoad > 0 ? acuteLoad / chronicLoad : 0; // > 1.3 is warning zone

        // Determine consistency (last 7 days)
        const workoutsLastWeek = recentWorkouts.filter(w => {
            const diff = new Date() - new Date(w.date);
            return diff < 7 * 24 * 60 * 60 * 1000;
        }).length;

        // Calculate Adherence (Real Logic)
        let adherence = 0.8; // Default fallback
        if (currentPlan && currentPlan.sessions) {
            const sessionsTillNow = currentPlan.sessions.filter(s => {
                // Include sessions that are today or in the past
                const sessionDate = new Date(); // In real app, match session day to date
                return !s.isFuture; // Simplified assumption: 'completed' flag or similar needed in real Plan object
            }).length || 1;

            // For now, let's look at completed sessions vs total planned sessions
            const completed = currentPlan.sessions.filter(s => s.completed).length;
            const total = currentPlan.sessions.length;
            if (total > 0) adherence = completed / total;
        }

        // Check for upcoming race in the next 14 days
        const hasUpcomingRace = goals ? goals.some(g => {
            if (g.type !== 'race' || !g.date) return false;
            const daysUntil = (new Date(g.date) - new Date()) / (1000 * 60 * 60 * 24);
            return daysUntil >= 0 && daysUntil <= 14;
        }) : false;

        this.beliefs = {
            hasHighFatigue: loadRatio > 1.3,
            hasLowFatigue: loadRatio < 0.8,
            isConsistent: workoutsLastWeek >= 3,
            isOverTraining: loadRatio > 1.5,
            isReturningFromBreak: totalWorkouts > 0 && workoutsLastWeek === 0,
            hasUpcomingRace: hasUpcomingRace,
            hasLowAdherence: adherence < 0.5,
        };
    }

    // --- 2. DESIRES: What do we want to achieve? ---
    updateDesires() {
        this.desires = [];

        // Hierarchy of Needs (Desires)

        // Safety First
        if (this.beliefs.isOverTraining || this.beliefs.hasHighFatigue) {
            this.desires.push('Prevent Injury');
            this.desires.push('Reduce Fatigue');
        }

        if (this.beliefs.hasUpcomingRace) {
            this.desires.push('Prepare for Race');
        }

        // Consistency second
        if (!this.beliefs.isConsistent && !this.beliefs.hasHighFatigue && !this.beliefs.hasUpcomingRace) {
            this.desires.push('Re-establish Routine');
        }

        // Performance third
        if (this.beliefs.isConsistent && !this.beliefs.hasHighFatigue) {
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
                case 'Prevent Injury':
                case 'Reduce Fatigue':
                    this.intentions.push({ type: 'REST', label: 'Suggest Recovery' });
                    break;
                case 'Prepare for Race':
                    this.intentions.push({ type: 'TAPER', label: 'Race Prep Mode' });
                    break;
                case 'Re-establish Routine':
                    this.intentions.push({ type: 'MOTIVATE', label: 'Encourage Small Step' });
                    break;
                case 'Improve Fitness':
                    this.intentions.push({ type: 'PUSH', label: 'Optimize Intensity' });
                    break;
                case 'Stay Active':
                default:
                    this.intentions.push({ type: 'MAINTAIN', label: 'Keep Going' });
                    break;
            }
        });
    }

    // Generate human-readable advice based on the primary intention
    generateAdvice() {
        const primary = this.intentions[0];
        if (!primary) return "Keep tracking your workouts!";

        switch (primary.type) {
            case 'REST':
                return "Your training load is spiking. Consider a light recovery session or a rest day to absorb the training.";
            case 'TAPER':
                return "Race day is approaching! Focus on sleep and easy details. Trust the training you've already done.";
            case 'MOTIVATE':
                return "It's been a quiet week. Let's try to get just 20 minutes in today to get back on track!";
            case 'PUSH':
                return "Consistency is looking great! You're ready for that interval session in your plan.";
            case 'MAINTAIN':
            default:
                return "You're doing well. Stick to the plan.";
        }
    }
}

export const aiMentalModel = new MentalStateService();
