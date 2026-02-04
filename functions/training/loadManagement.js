/**
 * Load Management - Prevent overtraining, optimize adaptation
 *
 * Implements intelligent load progression with:
 * - Safe load increases based on individual tolerance
 * - Injury risk prediction
 * - Optimal recovery day placement
 * - Fatigue accumulation modeling
 */

const { PerformanceAnalytics } = require('../analytics/performanceAnalytics');
const { RecoveryPatternLearning } = require('../analytics/recoveryPatterns');

class LoadManagement {
  constructor(performanceAnalytics, recoveryPatterns) {
    this.analytics = performanceAnalytics;
    this.recovery = recoveryPatterns;
  }

  /**
   * Calculate safe load progression for next week
   * Respects 10% rule but adjusts for individual tolerance
   *
   * @param {number} currentLoad - Current week's training load
   * @param {string} phase - Current training phase
   * @param {string} recoveryTrend - Recent recovery trend
   * @returns {Object} Target load with min/max bounds
   */
  calculateNextWeekLoad(currentLoad, phase, recoveryTrend) {
    const baseIncrease = 0.10; // 10% rule baseline

    // Adjust based on recovery trend
    let adjustmentFactor = 1.0;

    if (recoveryTrend === 'declining') {
      adjustmentFactor = 0.5; // Only 5% increase if recovery declining
    } else if (recoveryTrend === 'improving') {
      adjustmentFactor = 1.2; // Can push to 12% if recovering well
    }

    // Adjust based on phase
    let phaseFactor = 1.0;

    if (phase === 'taper') {
      return {
        targetLoad: currentLoad * 0.7, // 30% reduction
        minLoad: currentLoad * 0.6,
        maxLoad: currentLoad * 0.8,
        reasoning: 'Taper phase: significant volume reduction',
        confidence: 'HIGH'
      };
    }

    if (phase === 'peak') {
      phaseFactor = 0.8; // More conservative in peak phase
    }

    const increase = baseIncrease * adjustmentFactor * phaseFactor;
    const targetLoad = currentLoad * (1 + increase);

    return {
      targetLoad: Math.round(targetLoad),
      minLoad: Math.round(currentLoad * 0.95),
      maxLoad: Math.round(currentLoad * 1.15),
      reasoning: this.explainLoadRecommendation(increase, recoveryTrend, phase),
      confidence: this.calculateConfidence(recoveryTrend)
    };
  }

  /**
   * Explain load recommendation reasoning
   */
  explainLoadRecommendation(increase, recoveryTrend, phase) {
    const reasons = [];

    const percentIncrease = (increase * 100).toFixed(0);
    reasons.push(`${percentIncrease}% load increase recommended`);

    if (recoveryTrend === 'declining') {
      reasons.push('Recovery declining - conservative increase');
    } else if (recoveryTrend === 'improving') {
      reasons.push('Recovery improving - can push harder');
    }

    if (phase === 'peak') {
      reasons.push('Peak phase - maintaining intensity over volume');
    }

    return reasons.join('. ');
  }

  /**
   * Calculate confidence level in recommendation
   */
  calculateConfidence(recoveryTrend) {
    if (recoveryTrend === 'UNKNOWN') return 'LOW';
    if (recoveryTrend === 'stable' || recoveryTrend === 'improving') return 'HIGH';
    return 'MODERATE';
  }

  /**
   * Assess injury risk based on multiple factors
   * - Acute:chronic load ratio
   * - Training monotony
   * - Rapid load increases
   *
   * @returns {Object} Risk assessment with score and factors
   */
  async assessInjuryRisk() {
    const tsb = await this.analytics.calculateTSB();
    const monotony = await this.analytics.calculateMonotony();
    const loadProgression = await this.analyzeRecentLoadChanges();

    let riskScore = 0;
    let riskFactors = [];

    // Factor 1: High acute:chronic ratio (>1.5)
    if (tsb.ratio > 1.5) {
      riskScore += 40;
      riskFactors.push({
        factor: 'High acute:chronic ratio',
        value: tsb.ratio.toFixed(2),
        impact: 40,
        description: 'Acute load is very high relative to chronic load'
      });
    } else if (tsb.ratio > 1.3) {
      riskScore += 20;
      riskFactors.push({
        factor: 'Elevated acute:chronic ratio',
        value: tsb.ratio.toFixed(2),
        impact: 20,
        description: 'Acute load is moderately high vs chronic load'
      });
    }

    // Factor 2: High monotony (>2.0)
    if (monotony.monotony > 2.0) {
      riskScore += 30;
      riskFactors.push({
        factor: 'High training monotony',
        value: monotony.monotony.toFixed(2),
        impact: 30,
        description: 'Low variation in training load increases injury risk'
      });
    } else if (monotony.monotony > 1.5) {
      riskScore += 15;
      riskFactors.push({
        factor: 'Moderate training monotony',
        value: monotony.monotony.toFixed(2),
        impact: 15,
        description: 'Some lack of training variety'
      });
    }

    // Factor 3: Rapid load increase (>20% in one week)
    if (loadProgression.maxWeeklyIncrease > 0.20) {
      riskScore += 30;
      riskFactors.push({
        factor: 'Rapid load increase',
        value: `${(loadProgression.maxWeeklyIncrease * 100).toFixed(0)}%`,
        impact: 30,
        description: 'Weekly load increased too quickly'
      });
    } else if (loadProgression.maxWeeklyIncrease > 0.15) {
      riskScore += 15;
      riskFactors.push({
        factor: 'Moderate load increase',
        value: `${(loadProgression.maxWeeklyIncrease * 100).toFixed(0)}%`,
        impact: 15,
        description: 'Weekly load increase at upper limit'
      });
    }

    // Factor 4: Check recovery status
    if (this.recovery) {
      const recoveryTrend = await this.recovery.analyzeRecoveryTrend(7);
      if (recoveryTrend.trend === 'DECLINING') {
        riskScore += 20;
        riskFactors.push({
          factor: 'Declining recovery',
          value: recoveryTrend.trend,
          impact: 20,
          description: 'HRV trend shows declining recovery'
        });
      }
    }

    return {
      riskScore: Math.min(100, riskScore),
      riskLevel: this.classifyRiskLevel(riskScore),
      riskFactors,
      recommendation: this.getInjuryPreventionRecommendation(riskScore, riskFactors),
      assessmentDate: new Date()
    };
  }

  /**
   * Classify risk level from score
   */
  classifyRiskLevel(score) {
    if (score >= 70) return 'HIGH';
    if (score >= 40) return 'MODERATE';
    if (score >= 20) return 'LOW';
    return 'MINIMAL';
  }

  /**
   * Get injury prevention recommendation
   */
  getInjuryPreventionRecommendation(score, factors) {
    if (score >= 70) {
      return {
        urgency: 'IMMEDIATE',
        action: 'REDUCE_LOAD',
        message: 'High injury risk detected. Reduce training volume by 30-40% this week and focus on recovery.',
        specificActions: [
          'Take 1-2 complete rest days',
          'Replace hard workouts with easy runs',
          'Reduce weekly volume by 30-40%',
          'Prioritize sleep and recovery protocols',
          'Consider consulting sports medicine professional'
        ]
      };
    }

    if (score >= 40) {
      return {
        urgency: 'MODERATE',
        action: 'MODIFY_PLAN',
        message: 'Moderate injury risk. Implement recovery week and add training variety.',
        specificActions: [
          'Schedule a recovery week (30% volume reduction)',
          'Add variety to training (different paces, terrains)',
          'Ensure at least 1 full rest day per week',
          'Monitor recovery metrics closely'
        ]
      };
    }

    if (score >= 20) {
      return {
        urgency: 'LOW',
        action: 'MONITOR',
        message: 'Low injury risk. Continue monitoring recovery metrics.',
        specificActions: [
          'Maintain current training approach',
          'Continue monitoring HRV and recovery',
          'Ensure adequate rest between hard sessions'
        ]
      };
    }

    return {
      urgency: 'NONE',
      action: 'CONTINUE',
      message: 'Injury risk is minimal. Training load is well-managed.',
      specificActions: [
        'Continue current training plan',
        'Maintain good recovery practices'
      ]
    };
  }

  /**
   * Analyze recent load changes
   */
  async analyzeRecentLoadChanges() {
    const workouts = await this.analytics.getWorkouts(42); // 6 weeks

    if (workouts.length < 14) {
      return {
        maxWeeklyIncrease: 0,
        avgWeeklyChange: 0,
        isStable: true
      };
    }

    const weeklyLoads = this.analytics.groupByWeek(workouts);

    if (weeklyLoads.length < 2) {
      return {
        maxWeeklyIncrease: 0,
        avgWeeklyChange: 0,
        isStable: true
      };
    }

    // Calculate week-to-week changes
    const weeklyChanges = [];
    for (let i = 1; i < weeklyLoads.length; i++) {
      const change = (weeklyLoads[i] - weeklyLoads[i - 1]) / weeklyLoads[i - 1];
      weeklyChanges.push(change);
    }

    const maxIncrease = Math.max(...weeklyChanges.filter(c => c > 0));
    const avgChange = weeklyChanges.reduce((sum, c) => sum + Math.abs(c), 0) / weeklyChanges.length;

    return {
      maxWeeklyIncrease: maxIncrease,
      avgWeeklyChange: avgChange,
      isStable: avgChange < 0.15,
      weeklyLoads: weeklyLoads.slice(0, 6) // Return last 6 weeks
    };
  }

  /**
   * Optimal recovery day placement
   * Not just "every 4th week" - based on actual needs
   *
   * @param {number} upcomingWeeks - Number of weeks to plan
   * @returns {Array} Recommended recovery weeks
   */
  async scheduleRecoveryDays(upcomingWeeks) {
    const projectedFatigue = await this.projectFatigueAccumulation(upcomingWeeks);

    const recoveryWeeks = [];

    projectedFatigue.forEach((week, index) => {
      if (week.fatigueLevel > 0.75) {
        recoveryWeeks.push({
          weekNumber: index + 1,
          type: week.fatigueLevel > 0.85 ? 'FULL_RECOVERY' : 'ACTIVE_RECOVERY',
          reasoning: `Projected fatigue level: ${(week.fatigueLevel * 100).toFixed(0)}%`,
          recommendedReduction: week.fatigueLevel > 0.85 ? 0.4 : 0.3 // 40% or 30% reduction
        });
      }
    });

    // If no high fatigue projected, use standard 3:1 or 4:1 pattern
    if (recoveryWeeks.length === 0) {
      const pattern = 4; // Every 4th week
      for (let w = pattern; w <= upcomingWeeks; w += pattern) {
        recoveryWeeks.push({
          weekNumber: w,
          type: 'ACTIVE_RECOVERY',
          reasoning: 'Standard periodization recovery week',
          recommendedReduction: 0.3
        });
      }
    }

    return recoveryWeeks;
  }

  /**
   * Project fatigue accumulation over upcoming weeks
   */
  async projectFatigueAccumulation(weeks) {
    const currentTSB = await this.analytics.calculateTSB();
    const recentWorkouts = await this.analytics.getWorkouts(14);
    const avgWeeklyLoad = this.analytics.calculateLoad(recentWorkouts) / 2;

    const projection = [];

    let cumulativeFatigue = Math.max(0, -currentTSB.tsb / 50); // Normalize TSB to 0-1 scale

    for (let w = 1; w <= weeks; w++) {
      // Assume continued training at current load
      const weekLoad = avgWeeklyLoad * 1.05; // Slight progression
      const fatigueGain = weekLoad / 1000; // Arbitrary scaling

      // Fatigue accumulates but also dissipates slightly
      cumulativeFatigue = cumulativeFatigue * 0.9 + fatigueGain;

      projection.push({
        weekNumber: w,
        fatigueLevel: Math.min(1.0, cumulativeFatigue),
        projectedLoad: weekLoad,
        needsRecovery: cumulativeFatigue > 0.75
      });
    }

    return projection;
  }

  /**
   * Calculate safe long run progression
   * Progressive increase with safety caps
   *
   * @param {number} currentDistance - Current long run distance (km)
   * @param {string} phase - Current training phase
   * @param {number} raceDistance - Target race distance (km)
   * @returns {Object} Next long run recommendation
   */
  calculateLongRunProgression(currentDistance, phase, raceDistance) {
    // Phase-specific progression rates
    const progressionRates = {
      base: 1.10,    // 10% increase in base
      build: 1.08,   // 8% increase in build
      peak: 1.05,    // 5% increase in peak
      taper: 0.70    // 30% reduction in taper
    };

    const progressionRate = progressionRates[phase] || 1.08;
    const nextDistance = currentDistance * progressionRate;

    // Cap at reasonable maximums
    let maxLongRun;
    if (raceDistance >= 80) {
      maxLongRun = raceDistance * 0.7; // Ultra: 70% of race distance
    } else if (raceDistance >= 42) {
      maxLongRun = 35; // Marathon: 35km max
    } else if (raceDistance >= 21) {
      maxLongRun = 23; // Half marathon: 23km max
    } else {
      maxLongRun = raceDistance * 1.2; // 5-10K: 120% of race distance
    }

    const recommendedDistance = Math.min(nextDistance, maxLongRun);

    return {
      recommendedDistance: Math.round(recommendedDistance * 10) / 10,
      maxDistance: maxLongRun,
      progression: progressionRate,
      reasoning: this.explainLongRunProgression(
        currentDistance,
        recommendedDistance,
        phase,
        raceDistance
      )
    };
  }

  /**
   * Explain long run progression reasoning
   */
  explainLongRunProgression(current, recommended, phase, raceDistance) {
    const increase = ((recommended - current) / current * 100).toFixed(0);

    if (phase === 'taper') {
      return `Taper phase: Reducing long run by 30% to ${recommended}km for recovery`;
    }

    if (recommended >= raceDistance * 0.8) {
      return `Approaching race distance. Long run at ${recommended}km (${(recommended / raceDistance * 100).toFixed(0)}% of race)`;
    }

    return `${phase.charAt(0).toUpperCase() + phase.slice(1)} phase: Increasing long run by ${increase}% to ${recommended}km`;
  }

  /**
   * Validate weekly plan safety
   * Checks if planned week meets safety constraints
   */
  async validateWeeklyPlanSafety(plannedWeek) {
    const issues = [];
    const warnings = [];

    // Check total weekly load
    const totalLoad = plannedWeek.sessions.reduce((sum, s) => {
      return sum + (s.duration || 0) * this.getIntensityFactor(s.type);
    }, 0);

    const injuryRisk = await this.assessInjuryRisk();

    if (injuryRisk.riskLevel === 'HIGH' && totalLoad > 500) {
      issues.push({
        type: 'HIGH_LOAD_WITH_INJURY_RISK',
        severity: 'HIGH',
        message: 'High injury risk detected with high planned load',
        recommendation: 'Reduce weekly load by 30-40%'
      });
    }

    // Check hard day spacing
    const hardSessions = plannedWeek.sessions.filter(s =>
      ['intervals', 'tempo', 'long_run'].includes(s.type)
    );

    for (let i = 1; i < hardSessions.length; i++) {
      const dayGap = this.getDayGap(hardSessions[i - 1].day, hardSessions[i].day);
      if (dayGap < 2) {
        warnings.push({
          type: 'INSUFFICIENT_RECOVERY',
          severity: 'MODERATE',
          message: `Hard sessions on ${hardSessions[i - 1].day} and ${hardSessions[i].day} with only ${dayGap} day gap`,
          recommendation: 'Space hard sessions at least 2 days apart'
        });
      }
    }

    // Check rest days
    const restDays = plannedWeek.sessions.filter(s => s.type === 'rest').length;
    if (restDays < 1) {
      warnings.push({
        type: 'NO_REST_DAYS',
        severity: 'MODERATE',
        message: 'No rest days scheduled',
        recommendation: 'Include at least 1 full rest day per week'
      });
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      safetyScore: this.calculateSafetyScore(issues, warnings),
      injuryRisk: injuryRisk.riskLevel
    };
  }

  /**
   * Get intensity factor for workout type
   */
  getIntensityFactor(type) {
    const factors = {
      intervals: 2.0,
      tempo: 1.5,
      long_run: 1.2,
      easy_run: 1.0,
      recovery: 0.5,
      strength: 1.3,
      rest: 0
    };
    return factors[type] || 1.0;
  }

  /**
   * Calculate day gap between two days of week
   */
  getDayGap(day1, day2) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const index1 = days.indexOf(day1.toLowerCase());
    const index2 = days.indexOf(day2.toLowerCase());

    if (index1 === -1 || index2 === -1) return 7;

    return Math.abs(index2 - index1);
  }

  /**
   * Calculate safety score (0-100)
   */
  calculateSafetyScore(issues, warnings) {
    let score = 100;
    score -= issues.length * 30; // -30 per issue
    score -= warnings.length * 10; // -10 per warning
    return Math.max(0, score);
  }
}

module.exports = { LoadManagement };
