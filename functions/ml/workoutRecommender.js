/**
 * Workout Recommendation Engine
 *
 * Suggests workouts tailored to individual response patterns:
 * - Current phase and training goals
 * - Recent training load and recovery status
 * - Individual workout effectiveness
 * - Upcoming race demands
 * - Personal preferences and adherence patterns
 */

const { WorkoutResponseTracker } = require('../analytics/workoutResponse');
const { PerformanceAnalytics } = require('../analytics/performanceAnalytics');
const { RecoveryPatternLearning } = require('../analytics/recoveryPatterns');

class WorkoutRecommender {
  constructor(userId) {
    this.userId = userId;
    this.response = new WorkoutResponseTracker(userId);
    this.analytics = new PerformanceAnalytics(userId);
    this.recovery = new RecoveryPatternLearning(userId);
  }

  /**
   * Generate next workout based on comprehensive context
   *
   * @param {Object} context - Current training context
   * @returns {Object} Recommended workout with reasoning
   */
  async recommendNextWorkout(context) {
    const {
      phase,
      recoveryScore,
      recentLoad,
      raceDistance,
      weeksToRace,
      lastWorkout
    } = context;

    // Get workouts that work well for this athlete
    const effectiveness = await this.response.measureWorkoutEffectiveness();

    // Get phase-appropriate workouts
    const phaseWorkouts = this.getPhaseAppropriateWorkouts(phase);

    // Rank workouts by suitability
    const rankedWorkouts = phaseWorkouts
      .map(workout => ({
        ...workout,
        score: this.calculateWorkoutScore(workout, {
          effectiveness,
          recoveryScore,
          phase,
          lastWorkout,
          raceDistance
        })
      }))
      .sort((a, b) => b.score - a.score);

    // Select top workout
    const recommended = rankedWorkouts[0];

    // Adjust volume/intensity based on recovery
    const adjusted = this.adjustWorkoutForRecovery(recommended, recoveryScore);

    return {
      workout: adjusted,
      reasoning: this.explainRecommendation(recommended, context),
      alternatives: rankedWorkouts.slice(1, 3).map(w => ({
        type: w.type,
        title: w.title,
        score: w.score
      })),
      expectedBenefit: this.predictWorkoutBenefit(adjusted, phase),
      confidence: this.calculateRecommendationConfidence(effectiveness)
    };
  }

  /**
   * Calculate workout suitability score
   */
  calculateWorkoutScore(workout, context) {
    let score = 50; // Base score

    // Factor 1: Effectiveness for this athlete (max +30)
    if (context.effectiveness.status !== 'INSUFFICIENT_DATA') {
      const typeEffectiveness = context.effectiveness.effectiveness[workout.type];
      if (typeEffectiveness && typeEffectiveness.confidence !== 'LOW') {
        score += (typeEffectiveness.correlation * 30);
      }
    }

    // Factor 2: Recovery appropriateness (max +20)
    const recoveryMatch = this.matchRecoveryLevel(workout.intensity, context.recoveryScore);
    score += recoveryMatch;

    // Factor 3: Phase alignment (max +20)
    const phaseMatch = this.matchPhaseGoals(workout.type, context.phase);
    score += phaseMatch;

    // Factor 4: Variety from last workout (max +15)
    if (context.lastWorkout && workout.type !== context.lastWorkout.type) {
      score += 15; // Bonus for variety
    } else if (context.lastWorkout && workout.type === context.lastWorkout.type) {
      score -= 10; // Penalty for repetition
    }

    // Factor 5: Race specificity (max +15)
    if (context.raceDistance) {
      const raceMatch = this.matchRaceSpecificity(workout.type, context.raceDistance);
      score += raceMatch;
    }

    return score;
  }

  /**
   * Match workout intensity to recovery level
   */
  matchRecoveryLevel(workoutIntensity, recoveryScore) {
    // Recovery score: 0-100
    // Workout intensity: 'easy', 'moderate', 'hard'

    if (recoveryScore < 50) {
      // Low recovery: prefer easy workouts
      if (workoutIntensity === 'easy') return 20;
      if (workoutIntensity === 'moderate') return 5;
      return -10; // Penalty for hard workouts
    } else if (recoveryScore < 75) {
      // Moderate recovery: can handle moderate intensity
      if (workoutIntensity === 'moderate') return 20;
      if (workoutIntensity === 'easy') return 10;
      return 0;
    } else {
      // Good recovery: can push hard
      if (workoutIntensity === 'hard') return 20;
      if (workoutIntensity === 'moderate') return 15;
      return 5;
    }
  }

  /**
   * Match workout type to phase goals
   */
  matchPhaseGoals(workoutType, phase) {
    const phasePreferences = {
      base: {
        easy_run: 20,
        long_run: 20,
        recovery: 15,
        tempo: 5,
        intervals: 0,
        strength: 10
      },
      build: {
        tempo: 20,
        long_run: 15,
        easy_run: 15,
        intervals: 10,
        strength: 15,
        recovery: 10
      },
      peak: {
        intervals: 20,
        tempo: 20,
        long_run: 10,
        easy_run: 10,
        recovery: 15,
        strength: 5
      },
      taper: {
        easy_run: 20,
        recovery: 20,
        tempo: 10,
        intervals: 5,
        long_run: 0,
        strength: 0
      }
    };

    return phasePreferences[phase]?.[workoutType] || 0;
  }

  /**
   * Match workout to race distance specificity
   */
  matchRaceSpecificity(workoutType, raceDistance) {
    if (raceDistance <= 10) {
      // Short races: favor speed work
      const scores = {
        intervals: 15,
        tempo: 10,
        easy_run: 5,
        long_run: 0
      };
      return scores[workoutType] || 0;
    } else if (raceDistance <= 21) {
      // Half marathon: balance speed and endurance
      const scores = {
        tempo: 15,
        long_run: 10,
        intervals: 10,
        easy_run: 5
      };
      return scores[workoutType] || 0;
    } else {
      // Marathon+: favor endurance
      const scores = {
        long_run: 15,
        easy_run: 10,
        tempo: 10,
        intervals: 5
      };
      return scores[workoutType] || 0;
    }
  }

  /**
   * Get phase-appropriate workout templates
   */
  getPhaseAppropriateWorkouts(phase) {
    const templates = {
      base: [
        { type: 'easy_run', title: 'Easy Run', intensity: 'easy', duration: 45, description: 'Conversational pace' },
        { type: 'long_run', title: 'Long Run', intensity: 'moderate', duration: 90, description: 'Build aerobic endurance' },
        { type: 'recovery', title: 'Recovery Run', intensity: 'easy', duration: 30, description: 'Very easy, active recovery' },
        { type: 'tempo', title: 'Threshold Run', intensity: 'moderate', duration: 50, description: 'Comfortably hard pace' }
      ],
      build: [
        { type: 'tempo', title: 'Tempo Run', intensity: 'hard', duration: 60, description: 'Lactate threshold pace' },
        { type: 'intervals', title: '5x1000m', intensity: 'hard', duration: 50, description: 'VO2max intervals' },
        { type: 'long_run', title: 'Long Run', intensity: 'moderate', duration: 105, description: 'Endurance building' },
        { type: 'easy_run', title: 'Easy Run', intensity: 'easy', duration: 45, description: 'Recovery between hard sessions' },
        { type: 'strength', title: 'Strength Training', intensity: 'moderate', duration: 45, description: 'Injury prevention' }
      ],
      peak: [
        { type: 'intervals', title: 'Race Pace Intervals', intensity: 'hard', duration: 55, description: 'Race-specific speed' },
        { type: 'tempo', title: 'Tempo Run', intensity: 'hard', duration: 55, description: 'Threshold maintenance' },
        { type: 'long_run', title: 'Long Run', intensity: 'moderate', duration: 100, description: 'Race simulation' },
        { type: 'easy_run', title: 'Easy Run', intensity: 'easy', duration: 40, description: 'Active recovery' },
        { type: 'recovery', title: 'Recovery Run', intensity: 'easy', duration: 30, description: 'Full recovery' }
      ],
      taper: [
        { type: 'easy_run', title: 'Easy Run', intensity: 'easy', duration: 30, description: 'Maintain fitness' },
        { type: 'recovery', title: 'Shakeout Run', intensity: 'easy', duration: 20, description: 'Stay loose' },
        { type: 'tempo', title: 'Short Tempo', intensity: 'moderate', duration: 30, description: 'Maintain sharpness' }
      ]
    };

    return templates[phase] || templates.build;
  }

  /**
   * Adjust workout volume/intensity based on recovery
   */
  adjustWorkoutForRecovery(workout, recoveryScore) {
    const adjusted = { ...workout };

    if (recoveryScore < 50) {
      // Low recovery: reduce volume by 30-40%
      adjusted.duration = Math.round(workout.duration * 0.65);
      adjusted.adjustmentReason = 'Reduced volume due to low recovery';
      adjusted.modified = true;
    } else if (recoveryScore < 70) {
      // Moderate recovery: slight reduction
      adjusted.duration = Math.round(workout.duration * 0.85);
      adjusted.adjustmentReason = 'Slightly reduced due to moderate recovery';
      adjusted.modified = true;
    } else {
      adjusted.modified = false;
    }

    return adjusted;
  }

  /**
   * Explain workout recommendation
   */
  explainRecommendation(workout, context) {
    const reasons = [];

    // Recovery match
    if (context.recoveryScore < 50) {
      reasons.push('Recovery is low - recommending lighter workout');
    } else if (context.recoveryScore > 80) {
      reasons.push('Recovery is excellent - good day for quality work');
    }

    // Phase alignment
    reasons.push(`${context.phase} phase: focusing on ${this.getPhaseGoal(context.phase)}`);

    // Variety
    if (context.lastWorkout && workout.type !== context.lastWorkout.type) {
      reasons.push('Provides variety from last workout');
    }

    // Race preparation
    if (context.weeksToRace && context.weeksToRace <= 4) {
      reasons.push(`${context.weeksToRace} weeks to race: race-specific training`);
    }

    return reasons.join('. ');
  }

  /**
   * Get phase goal description
   */
  getPhaseGoal(phase) {
    const goals = {
      base: 'building aerobic base and volume',
      build: 'developing threshold and strength',
      peak: 'race-specific intensity and sharpness',
      taper: 'recovery and freshness for race day'
    };
    return goals[phase] || 'progressive training';
  }

  /**
   * Predict workout benefit
   */
  predictWorkoutBenefit(workout, phase) {
    const benefits = {
      easy_run: {
        aerobic: 'moderate',
        recovery: 'high',
        speed: 'low',
        endurance: 'moderate'
      },
      long_run: {
        aerobic: 'high',
        recovery: 'low',
        speed: 'low',
        endurance: 'high'
      },
      tempo: {
        aerobic: 'high',
        recovery: 'low',
        speed: 'moderate',
        endurance: 'moderate',
        threshold: 'high'
      },
      intervals: {
        aerobic: 'moderate',
        recovery: 'very low',
        speed: 'high',
        endurance: 'low',
        vo2max: 'high'
      },
      recovery: {
        aerobic: 'low',
        recovery: 'very high',
        speed: 'none',
        endurance: 'low'
      }
    };

    return benefits[workout.type] || {};
  }

  /**
   * Calculate recommendation confidence
   */
  calculateRecommendationConfidence(effectiveness) {
    if (!effectiveness || effectiveness.status === 'INSUFFICIENT_DATA') {
      return 'LOW';
    }

    const confidences = Object.values(effectiveness.effectiveness || {})
      .map(e => e.confidence)
      .filter(c => c);

    if (confidences.length === 0) return 'LOW';

    const highConfidence = confidences.filter(c => c === 'HIGH').length;
    const totalConfidence = confidences.length;

    if (highConfidence / totalConfidence > 0.5) return 'HIGH';
    if (highConfidence / totalConfidence > 0.25) return 'MODERATE';
    return 'LOW';
  }

  /**
   * Generate full week of workouts
   * Optimized for load distribution and recovery
   */
  async recommendWeeklyPlan(context) {
    const {
      phase,
      availableDays,
      targetWeeklyLoad,
      recoveryPattern,
      raceDistance,
      weeksToRace
    } = context;

    // Distribute load across week
    const loadDistribution = this.optimizeLoadDistribution(
      targetWeeklyLoad,
      availableDays,
      recoveryPattern
    );

    // Generate workouts for each day
    const weekPlan = [];

    for (let i = 0; i < availableDays.length; i++) {
      const day = availableDays[i];
      const dayLoad = loadDistribution[i];

      // Determine workout type based on day position and load
      const workoutType = this.selectWorkoutType(i, dayLoad, phase, availableDays.length);

      // Get specific workout recommendation
      const workout = await this.generateSpecificWorkout(workoutType, dayLoad, {
        phase,
        raceDistance,
        weeksToRace,
        dayIndex: i,
        totalDays: availableDays.length
      });

      weekPlan.push({
        day,
        ...workout
      });
    }

    // Validate and adjust week
    const validation = this.validateWeekPlan(weekPlan, phase);

    return {
      weekPlan,
      totalLoad: this.calculateTotalLoad(weekPlan),
      loadBalance: this.assessLoadBalance(weekPlan),
      recoveryAdequacy: this.assessRecoveryAdequacy(weekPlan),
      validation
    };
  }

  /**
   * Optimize load distribution across week
   */
  optimizeLoadDistribution(targetLoad, availableDays, recoveryPattern) {
    const numDays = availableDays.length;
    const distribution = [];

    // Pattern: hard-easy-hard-easy or hard-easy-easy-hard
    const pattern = recoveryPattern === 'slow' ? [1.3, 0.7, 0.8, 1.2] : [1.4, 0.7, 1.3, 0.8];

    for (let i = 0; i < numDays; i++) {
      const patternValue = pattern[i % pattern.length];
      distribution.push(patternValue);
    }

    // Normalize to target load
    const totalPattern = distribution.reduce((sum, v) => sum + v, 0);
    const normalizedDistribution = distribution.map(v =>
      (v / totalPattern) * targetLoad
    );

    return normalizedDistribution;
  }

  /**
   * Select workout type for specific day
   */
  selectWorkoutType(dayIndex, dayLoad, phase, totalDays) {
    // First day: often long run or key workout
    if (dayIndex === 0) {
      return phase === 'base' ? 'long_run' : 'tempo';
    }

    // High load day: quality workout
    if (dayLoad > 60) {
      if (phase === 'peak') return 'intervals';
      if (phase === 'build') return 'tempo';
      return 'long_run';
    }

    // Low load day: easy or recovery
    if (dayLoad < 40) {
      return dayLoad < 30 ? 'recovery' : 'easy_run';
    }

    // Medium load day: moderate workout
    return 'easy_run';
  }

  /**
   * Generate specific workout details
   */
  async generateSpecificWorkout(type, targetLoad, context) {
    const templates = this.getPhaseAppropriateWorkouts(context.phase);
    const template = templates.find(t => t.type === type) || templates[0];

    // Adjust duration to match target load
    const duration = this.calculateDurationForLoad(targetLoad, type);

    return {
      type,
      title: template.title,
      description: template.description,
      duration: Math.round(duration),
      intensity: template.intensity,
      load: targetLoad
    };
  }

  /**
   * Calculate duration needed for target load
   */
  calculateDurationForLoad(targetLoad, type) {
    const intensityFactors = {
      intervals: 2.0,
      tempo: 1.5,
      long_run: 1.2,
      easy_run: 1.0,
      recovery: 0.5,
      strength: 1.3
    };

    const factor = intensityFactors[type] || 1.0;
    return targetLoad / factor;
  }

  /**
   * Calculate total weekly load
   */
  calculateTotalLoad(weekPlan) {
    return weekPlan.reduce((sum, workout) => sum + (workout.load || 0), 0);
  }

  /**
   * Assess load balance across week
   */
  assessLoadBalance(weekPlan) {
    const loads = weekPlan.map(w => w.load || 0);
    const maxLoad = Math.max(...loads);
    const minLoad = Math.min(...loads.filter(l => l > 0));

    const ratio = maxLoad / minLoad;

    if (ratio < 2) return 'EXCELLENT';
    if (ratio < 3) return 'GOOD';
    if (ratio < 4) return 'MODERATE';
    return 'POOR';
  }

  /**
   * Assess recovery adequacy
   */
  assessRecoveryAdequacy(weekPlan) {
    const easyDays = weekPlan.filter(w =>
      w.type === 'easy_run' || w.type === 'recovery'
    ).length;

    const hardDays = weekPlan.filter(w =>
      w.type === 'intervals' || w.type === 'tempo' || w.type === 'long_run'
    ).length;

    const ratio = easyDays / (easyDays + hardDays);

    if (ratio >= 0.7) return 'EXCELLENT'; // 70%+ easy
    if (ratio >= 0.6) return 'GOOD';
    if (ratio >= 0.5) return 'MODERATE';
    return 'INSUFFICIENT';
  }

  /**
   * Validate week plan
   */
  validateWeekPlan(weekPlan, phase) {
    const issues = [];
    const warnings = [];

    // Check for consecutive hard days
    for (let i = 1; i < weekPlan.length; i++) {
      const prevHard = ['intervals', 'tempo', 'long_run'].includes(weekPlan[i - 1].type);
      const currentHard = ['intervals', 'tempo', 'long_run'].includes(weekPlan[i].type);

      if (prevHard && currentHard) {
        warnings.push(`Hard workouts on consecutive days: ${weekPlan[i - 1].day} and ${weekPlan[i].day}`);
      }
    }

    // Check for adequate recovery
    const easyDays = weekPlan.filter(w => w.type === 'easy_run' || w.type === 'recovery').length;
    if (easyDays < 2) {
      issues.push('Insufficient easy/recovery days (minimum 2 recommended)');
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings
    };
  }
}

module.exports = { WorkoutRecommender };
