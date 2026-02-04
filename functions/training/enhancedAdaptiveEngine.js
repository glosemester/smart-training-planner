/**
 * Enhanced Adaptive Engine (Fase 4)
 *
 * Integrates all Fase 1-3 components:
 * - Personalized recovery thresholds (Fase 1)
 * - Adaptive periodization & load management (Fase 2)
 * - ML-powered predictions & recommendations (Fase 3)
 *
 * Replaces static thresholds with learned patterns.
 */

const { PerformanceAnalytics } = require('../analytics/performanceAnalytics');
const { RecoveryPatternLearning } = require('../analytics/recoveryPatterns');
const { WorkoutResponseTracker } = require('../analytics/workoutResponse');
const { LoadManagement } = require('./loadManagement');
const { PerformancePredictor } = require('../ml/performancePredictor');
const { WorkoutRecommender } = require('../ml/workoutRecommender');

class EnhancedAdaptiveEngine {
  constructor(userId) {
    this.userId = userId;
    this.analytics = new PerformanceAnalytics(userId);
    this.recovery = new RecoveryPatternLearning(userId);
    this.response = new WorkoutResponseTracker(userId);
    this.loadManager = new LoadManagement(this.analytics, this.recovery);
    this.predictor = new PerformancePredictor(userId);
    this.recommender = new WorkoutRecommender(userId);
  }

  /**
   * Generate comprehensive daily recommendation
   * Uses personalized thresholds and ML predictions
   */
  async generateDailyRecommendation(context) {
    const {
      whoopData,
      todaysWorkout,
      currentPhase,
      raceDistance,
      weeksToRace
    } = context;

    // Get personalized recovery pattern
    const recoveryPattern = await this.recovery.learnRecoveryPattern();

    // Analyze recovery with personalized thresholds
    const recoveryAnalysis = this.analyzeRecovery(
      whoopData,
      recoveryPattern
    );

    // Get injury risk assessment
    const injuryRisk = await this.loadManager.assessInjuryRisk();

    // Get TSB (Training Stress Balance)
    const tsb = await this.analytics.calculateTSB();

    // Determine if we should adjust today's workout
    const adjustment = await this.determineAdjustment({
      todaysWorkout,
      recoveryAnalysis,
      injuryRisk,
      tsb,
      currentPhase,
      recoveryPattern
    });

    // Get ML-powered workout recommendation if needed
    let mlRecommendation = null;
    if (adjustment.action === 'REPLACE' || adjustment.action === 'SUGGEST_ALTERNATIVE') {
      mlRecommendation = await this.recommender.recommendNextWorkout({
        phase: currentPhase,
        recoveryScore: recoveryAnalysis.readinessScore,
        recentLoad: tsb,
        raceDistance,
        weeksToRace,
        lastWorkout: null // Could fetch from history
      });
    }

    // Generate overall recommendation
    const overallRecommendation = this.generateOverallRecommendation({
      recoveryAnalysis,
      injuryRisk,
      tsb,
      currentPhase,
      adjustment
    });

    return {
      date: new Date().toISOString().split('T')[0],
      recovery: recoveryAnalysis,
      injuryRisk,
      load: tsb,
      adjustment,
      mlRecommendation,
      overallRecommendation,
      personalizedThresholds: recoveryPattern.thresholds,
      confidence: recoveryPattern.confidence
    };
  }

  /**
   * Analyze recovery with personalized thresholds
   */
  analyzeRecovery(whoopData, recoveryPattern) {
    const {
      recoveryScore = 50,
      hrv = recoveryPattern.baseline,
      restingHr = 55,
      sleepPerformance = 75,
      strain = 0
    } = whoopData;

    // Use personalized HRV thresholds instead of static
    const thresholds = recoveryPattern.thresholds || {
      critical: 30,
      warning: 40,
      optimal: 50,
      prime: 60
    };

    // Calculate readiness score from HRV
    const readinessScore = this.recovery.hrvToReadinessScore(hrv, recoveryPattern.baseline);

    // Determine status based on personal thresholds
    let status;
    let adjustmentFactor;
    let recommendation;

    if (hrv < thresholds.critical || recoveryScore < 33) {
      status = 'CRITICAL';
      adjustmentFactor = 0.3;
      recommendation = 'Kritisk lav restitusjon. Din personlige HRV-terskel anbefaler hviledag.';
    } else if (hrv < thresholds.warning || recoveryScore < 50) {
      status = 'WARNING';
      adjustmentFactor = 0.6;
      recommendation = 'Under din personlige baseline. Reduser intensitet betydelig.';
    } else if (hrv < thresholds.optimal || recoveryScore < 67) {
      status = 'MODERATE';
      adjustmentFactor = 0.85;
      recommendation = 'Moderat restitusjon. Følg planen, men vær forsiktig.';
    } else if (hrv >= thresholds.prime && recoveryScore >= 85) {
      status = 'PRIME';
      adjustmentFactor = 1.1;
      recommendation = 'Over din personlige baseline! Optimal dag for kvalitetstrening.';
    } else {
      status = 'GOOD';
      adjustmentFactor = 1.0;
      recommendation = 'God restitusjon relativt til din baseline. Kjør som planlagt.';
    }

    // Adjust for sleep
    if (sleepPerformance < 60) {
      adjustmentFactor *= 0.85;
      recommendation += ' Dårlig søvn reduserer kapasitet.';
    }

    // Adjust for high strain
    if (strain > 18) {
      adjustmentFactor *= 0.9;
      recommendation += ' Høy akkumulert strain.';
    }

    return {
      status,
      recoveryScore,
      hrv,
      hrvBaseline: recoveryPattern.baseline,
      hrvDeviation: ((hrv - recoveryPattern.baseline) / recoveryPattern.baseline * 100).toFixed(1),
      readinessScore,
      adjustmentFactor: Math.round(adjustmentFactor * 100) / 100,
      recommendation,
      personalizedThresholds: thresholds,
      recoverySpeed: recoveryPattern.recoverySpeed
    };
  }

  /**
   * Determine workout adjustment based on comprehensive analysis
   */
  async determineAdjustment(params) {
    const {
      todaysWorkout,
      recoveryAnalysis,
      injuryRisk,
      tsb,
      currentPhase,
      recoveryPattern
    } = params;

    // Priority 1: HIGH injury risk - mandatory rest
    if (injuryRisk.riskLevel === 'HIGH') {
      return {
        action: 'REPLACE',
        workout: {
          type: 'rest',
          title: 'Hviledag (Injury Risk)',
          description: 'Høy skaderisiko detektert. Prioriter restitusjon.'
        },
        reasoning: `Injury risk: ${injuryRisk.riskScore}/100. ${injuryRisk.riskFactors.map(f => f.description).join(', ')}`,
        source: 'INJURY_RISK_MODEL',
        confidence: 'HIGH'
      };
    }

    // Priority 2: CRITICAL recovery - rest day
    if (recoveryAnalysis.status === 'CRITICAL') {
      return {
        action: 'REPLACE',
        workout: {
          type: 'rest',
          title: 'Hviledag (Recovery)',
          description: recoveryAnalysis.recommendation
        },
        reasoning: `HRV ${recoveryAnalysis.hrv} under personal critical threshold ${recoveryPattern.thresholds.critical}`,
        source: 'PERSONALIZED_RECOVERY',
        confidence: 'HIGH'
      };
    }

    // Priority 3: WARNING recovery - reduce workout
    if (recoveryAnalysis.status === 'WARNING') {
      return {
        action: 'ADJUST',
        workout: this.reduceWorkout(todaysWorkout, recoveryAnalysis.adjustmentFactor),
        reasoning: `HRV ${recoveryAnalysis.hrv} under personal warning threshold ${recoveryPattern.thresholds.warning}. Reducing to ${(recoveryAnalysis.adjustmentFactor * 100).toFixed(0)}%`,
        source: 'PERSONALIZED_RECOVERY',
        confidence: 'HIGH'
      };
    }

    // Priority 4: OVERREACHING status (TSB) - suggest lighter day
    if (tsb.status === 'OVERREACHING') {
      return {
        action: 'ADJUST',
        workout: this.reduceWorkout(todaysWorkout, 0.7),
        reasoning: `Acute:Chronic ratio ${tsb.ratio} indicates overreaching. Reducing to 70% capacity.`,
        source: 'TSB_ANALYSIS',
        confidence: 'HIGH'
      };
    }

    // Priority 5: MODERATE injury risk - modify workout
    if (injuryRisk.riskLevel === 'MODERATE') {
      return {
        action: 'ADJUST',
        workout: this.reduceWorkout(todaysWorkout, 0.85),
        reasoning: `Moderate injury risk (${injuryRisk.riskScore}/100). Conservative adjustment.`,
        source: 'INJURY_RISK_MODEL',
        confidence: 'MODERATE'
      };
    }

    // Priority 6: MODERATE recovery - slight adjustment
    if (recoveryAnalysis.status === 'MODERATE') {
      return {
        action: 'ADJUST',
        workout: this.reduceWorkout(todaysWorkout, recoveryAnalysis.adjustmentFactor),
        reasoning: recoveryAnalysis.recommendation,
        source: 'PERSONALIZED_RECOVERY',
        confidence: 'MODERATE'
      };
    }

    // Priority 7: PRIME recovery - allow full intensity
    if (recoveryAnalysis.status === 'PRIME') {
      return {
        action: 'BOOST',
        workout: this.boostWorkout(todaysWorkout, recoveryAnalysis.adjustmentFactor),
        reasoning: `Excellent recovery! HRV ${recoveryAnalysis.hrv} above prime threshold. Green light for quality work.`,
        source: 'PERSONALIZED_RECOVERY',
        confidence: 'HIGH'
      };
    }

    // Default: Continue as planned
    return {
      action: 'CONTINUE',
      workout: todaysWorkout,
      reasoning: 'All metrics within optimal range. Proceed with planned workout.',
      source: 'COMPREHENSIVE_ANALYSIS',
      confidence: 'HIGH'
    };
  }

  /**
   * Reduce workout intensity/volume
   */
  reduceWorkout(workout, factor) {
    if (!workout) return null;

    return {
      ...workout,
      duration_minutes: Math.round(workout.duration_minutes * factor),
      details: {
        ...workout.details,
        distance_km: workout.details?.distance_km ? Math.round(workout.details.distance_km * factor * 10) / 10 : undefined
      },
      is_adjusted: true,
      adjustment_factor: factor,
      adjustment_type: 'REDUCED'
    };
  }

  /**
   * Boost workout for prime recovery days
   */
  boostWorkout(workout, factor) {
    if (!workout) return null;

    // Only boost if factor > 1.0 and not already an easy day
    if (factor <= 1.0 || workout.type === 'recovery' || workout.type === 'easy_run') {
      return workout;
    }

    return {
      ...workout,
      title: `[Green Light] ${workout.title}`,
      description: `${workout.description} Prime recovery - push the intensity!`,
      is_adjusted: true,
      adjustment_factor: factor,
      adjustment_type: 'BOOSTED'
    };
  }

  /**
   * Generate overall recommendation text
   */
  generateOverallRecommendation(params) {
    const {
      recoveryAnalysis,
      injuryRisk,
      tsb,
      currentPhase,
      adjustment
    } = params;

    const parts = [];

    // Recovery summary
    parts.push(`Recovery: ${recoveryAnalysis.status} (HRV ${recoveryAnalysis.hrv}, ${recoveryAnalysis.hrvDeviation}% from baseline)`);

    // Injury risk summary
    if (injuryRisk.riskLevel !== 'MINIMAL') {
      parts.push(`Injury Risk: ${injuryRisk.riskLevel} (${injuryRisk.riskScore}/100)`);
    }

    // TSB summary
    parts.push(`Load: ${tsb.status} (Acute/Chronic ${tsb.ratio})`);

    // Adjustment recommendation
    parts.push(`Action: ${adjustment.action} - ${adjustment.reasoning}`);

    // Phase-specific advice
    if (currentPhase === 'taper') {
      parts.push('Taper phase: Trust the process, prioritize freshness over fitness.');
    } else if (currentPhase === 'peak' && recovery.status === 'PRIME') {
      parts.push('Peak phase with prime recovery: Great day for race-specific intensity!');
    }

    return parts.join('\n');
  }

  /**
   * Get weekly plan recommendation
   * Uses ML-powered workout recommender
   */
  async recommendWeeklyPlan(context) {
    const {
      phase,
      availableDays,
      targetWeeklyLoad,
      raceDistance,
      weeksToRace
    } = context;

    // Get recovery pattern for micro-cycle optimization
    const recoveryPattern = await this.recovery.learnRecoveryPattern();

    // Get ML-powered weekly recommendation
    const weeklyPlan = await this.recommender.recommendWeeklyPlan({
      phase,
      availableDays,
      targetWeeklyLoad,
      recoveryPattern: recoveryPattern.recoverySpeed,
      raceDistance,
      weeksToRace
    });

    // Validate safety
    const validation = await this.loadManager.validateWeeklyPlanSafety({
      sessions: weeklyPlan.weekPlan
    });

    return {
      weekPlan: weeklyPlan.weekPlan,
      loadBalance: weeklyPlan.loadBalance,
      recoveryAdequacy: weeklyPlan.recoveryAdequacy,
      validation,
      personalizedFor: {
        recoverySpeed: recoveryPattern.recoverySpeed,
        baselineHRV: recoveryPattern.baseline
      }
    };
  }

  /**
   * Predict race performance
   */
  async predictRacePerformance(raceDate, raceDistance) {
    return await this.predictor.predictRaceDayPerformance(raceDate, raceDistance);
  }

  /**
   * Get comprehensive athlete insights
   */
  async getAthleteInsights() {
    const [
      currentVDOT,
      tsb,
      monotony,
      recoveryPattern,
      injuryRisk,
      adherence
    ] = await Promise.all([
      this.analytics.getCurrentVDOT(),
      this.analytics.calculateTSB(),
      this.analytics.calculateMonotony(),
      this.recovery.learnRecoveryPattern(),
      this.loadManager.assessInjuryRisk(),
      this.response.analyzeAdherence()
    ]);

    return {
      fitness: {
        currentVDOT: Math.round(currentVDOT * 10) / 10,
        experienceLevel: await this.analytics.assessExperienceLevel()
      },
      recovery: {
        pattern: recoveryPattern,
        speed: recoveryPattern.recoverySpeed,
        confidence: `${Math.round(recoveryPattern.confidence * 100)}%`
      },
      load: {
        tsb,
        monotony,
        status: tsb.status
      },
      injury: {
        riskLevel: injuryRisk.riskLevel,
        riskScore: injuryRisk.riskScore,
        factors: injuryRisk.riskFactors
      },
      adherence: {
        overallRate: adherence.overallCompletionRate,
        insights: adherence.insights
      }
    };
  }
}

module.exports = { EnhancedAdaptiveEngine };
