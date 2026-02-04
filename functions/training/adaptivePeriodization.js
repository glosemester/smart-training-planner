/**
 * Adaptive Periodization - Phases that respond to progression
 *
 * Dynamically adjusts training phases based on:
 * - Experience level
 * - Current fitness vs goal fitness
 * - Race distance
 * - Available training time
 * - Actual progression rate
 */

const { PerformanceAnalytics } = require('../analytics/performanceAnalytics');

class AdaptivePeriodization {
  constructor(userData, performanceAnalytics = null) {
    this.user = userData;
    this.analytics = performanceAnalytics || new PerformanceAnalytics(userData.uid);
  }

  /**
   * Calculate optimal phase distribution
   * Considers: experience, current fitness, race distance, available time
   *
   * @param {number} totalWeeks - Total weeks available for training
   * @param {number} raceDistance - Race distance in km
   * @returns {Object} Phase distribution with reasoning
   */
  async calculateOptimalPhases(totalWeeks, raceDistance) {
    const experience = await this.assessExperienceLevel();
    const currentFitness = await this.analytics.getCurrentVDOT();
    const targetFitness = this.estimateTargetVDOT(raceDistance, this.user.targetTime);
    const fitnessGap = targetFitness - currentFitness;

    // Base phase percentages by experience level
    let basePercentage = this.getBasePhasePercentage(experience);

    // Adjust for fitness gap (larger gap = longer base phase)
    if (fitnessGap > 5) {
      basePercentage += 0.10; // Add 10% to base phase
    } else if (fitnessGap > 10) {
      basePercentage += 0.15; // Add 15% for very large gap
    }

    // Ultra distances need more base building
    if (raceDistance >= 50) {
      basePercentage += 0.15;
    } else if (raceDistance >= 30) {
      basePercentage += 0.10;
    }

    // Very short plans (< 8 weeks) need compressed phases
    if (totalWeeks < 8) {
      basePercentage = Math.min(basePercentage, 0.35);
    }

    // Calculate other phases
    const buildPercentage = 0.35;
    const taperWeeks = this.calculateTaperLength(raceDistance, totalWeeks);
    const taperPercentage = taperWeeks / totalWeeks;
    const peakPercentage = Math.max(0.10, 1 - basePercentage - buildPercentage - taperPercentage);

    // Convert to actual weeks
    const phases = {
      base: Math.ceil(totalWeeks * basePercentage),
      build: Math.ceil(totalWeeks * buildPercentage),
      peak: Math.ceil(totalWeeks * peakPercentage),
      taper: taperWeeks,
      reasoning: this.explainPhaseDistribution({
        basePercentage,
        buildPercentage,
        peakPercentage,
        taperPercentage,
        experience,
        fitnessGap,
        raceDistance,
        totalWeeks
      })
    };

    // Ensure phases add up to total weeks (adjust peak if needed)
    const sum = phases.base + phases.build + phases.peak + phases.taper;
    if (sum !== totalWeeks) {
      phases.peak = Math.max(1, phases.peak + (totalWeeks - sum));
    }

    return phases;
  }

  /**
   * Get base phase percentage by experience level
   */
  getBasePhasePercentage(experience) {
    const percentages = {
      beginner: 0.50,      // Beginners need more base
      intermediate: 0.40,  // Moderate base
      advanced: 0.30       // Advanced can handle more intensity sooner
    };
    return percentages[experience] || 0.40;
  }

  /**
   * Calculate optimal taper length based on race distance
   */
  calculateTaperLength(raceDistance, totalWeeks) {
    if (raceDistance >= 80) return Math.min(3, Math.floor(totalWeeks * 0.15)); // Ultra: 3 weeks
    if (raceDistance >= 42) return 2; // Marathon: 2 weeks
    if (raceDistance >= 21) return 2; // Half marathon: 2 weeks
    if (raceDistance >= 10) return 1; // 10K-15K: 1 week
    return 1; // 5K and shorter: 1 week
  }

  /**
   * Estimate target VDOT based on race distance and goal time
   */
  estimateTargetVDOT(distanceKm, targetTimeSeconds) {
    if (!targetTimeSeconds) {
      // No target time specified, estimate moderate improvement
      return this.analytics.getCurrentVDOT().then(current => current + 3);
    }
    return this.analytics.calculateVDOT(distanceKm, targetTimeSeconds);
  }

  /**
   * Explain phase distribution reasoning
   */
  explainPhaseDistribution(params) {
    const reasons = [];

    // Experience explanation
    if (params.experience === 'beginner') {
      reasons.push('Lengre basefase for nybegynnere (50% av planen)');
    } else if (params.experience === 'advanced') {
      reasons.push('Kortere basefase for erfarne løpere (30% av planen)');
    }

    // Fitness gap explanation
    if (params.fitnessGap > 10) {
      reasons.push('Stor fitness-gap krever ekstra basetid (+15%)');
    } else if (params.fitnessGap > 5) {
      reasons.push('Moderat fitness-gap - utvidet basefase (+10%)');
    }

    // Distance explanation
    if (params.raceDistance >= 50) {
      reasons.push('Ultramarathon-distanse krever omfattende basebygging (+15%)');
    } else if (params.raceDistance >= 42) {
      reasons.push('Marathon-distanse med 2 ukers taper');
    }

    // Short plan warning
    if (params.totalWeeks < 8) {
      reasons.push('Kort tidsramme - komprimerte faser');
    }

    return reasons;
  }

  /**
   * Assess experience level from training history
   */
  async assessExperienceLevel() {
    return await this.analytics.assessExperienceLevel();
  }

  /**
   * Adjust phases mid-plan based on progression
   * Checks if athlete is progressing faster or slower than expected
   *
   * @param {number} currentWeek - Current week number
   * @param {Object} plan - Current training plan
   * @returns {Object} Adjustment recommendation
   */
  async adjustPhasesBasedOnProgress(currentWeek, plan) {
    // Get progression rate (actual vs expected fitness improvement)
    const progressionRate = await this.calculateProgressionRate(currentWeek, plan);

    if (progressionRate > 1.2) {
      // Progressing 20% faster than expected
      return {
        action: 'ADVANCE_PHASE',
        newPhase: this.getNextPhase(plan.currentPhase),
        reasoning: `Fitness progresjon er ${((progressionRate - 1) * 100).toFixed(0)}% over forventet. Kan avansere til neste fase tidligere.`,
        confidence: 'MODERATE'
      };
    }

    if (progressionRate < 0.8) {
      // Progressing slower than expected
      return {
        action: 'EXTEND_PHASE',
        additionalWeeks: 1,
        reasoning: `Fitness progresjon er ${((1 - progressionRate) * 100).toFixed(0)}% under forventet. Trenger mer tid for adaptasjoner.`,
        confidence: 'MODERATE'
      };
    }

    // Check for overtraining signals
    const tsb = await this.analytics.calculateTSB();
    if (tsb.status === 'OVERREACHING' || tsb.status === 'FATIGUED') {
      return {
        action: 'INSERT_RECOVERY_WEEK',
        reasoning: 'TSB indikerer overtrening. Setter inn ekstra recovery-uke.',
        confidence: 'HIGH'
      };
    }

    return {
      action: 'CONTINUE',
      reasoning: 'Progresjon er on track med planen',
      confidence: 'HIGH'
    };
  }

  /**
   * Calculate actual progression rate vs expected
   */
  async calculateProgressionRate(currentWeek, plan) {
    // Get VDOT progression over last 4 weeks
    const workouts = await this.analytics.getWorkouts(28);

    if (workouts.length < 10) {
      return 1.0; // Not enough data, assume on track
    }

    // Calculate average pace improvement
    const recentWorkouts = workouts.slice(0, Math.floor(workouts.length / 2));
    const olderWorkouts = workouts.slice(Math.floor(workouts.length / 2));

    const recentPace = this.calculateAveragePace(recentWorkouts);
    const olderPace = this.calculateAveragePace(olderWorkouts);

    if (recentPace === 0 || olderPace === 0) {
      return 1.0;
    }

    // Pace improvement (lower is better)
    const improvement = (olderPace - recentPace) / olderPace;

    // Expected improvement: 0.5% per week
    const weeksElapsed = Math.min(currentWeek, 4);
    const expectedImprovement = 0.005 * weeksElapsed;

    // Calculate ratio
    return improvement / expectedImprovement;
  }

  /**
   * Calculate average pace from workouts
   */
  calculateAveragePace(workouts) {
    const paces = workouts
      .filter(w => w.pace && w.pace > 0)
      .map(w => w.pace);

    if (paces.length === 0) return 0;

    return paces.reduce((sum, p) => sum + p, 0) / paces.length;
  }

  /**
   * Get next phase in progression
   */
  getNextPhase(currentPhase) {
    const progression = {
      'base': 'build',
      'build': 'peak',
      'peak': 'taper',
      'taper': 'taper' // Already at end
    };
    return progression[currentPhase] || 'build';
  }

  /**
   * Micro-periodization within phases
   * Generates loading patterns (e.g., 3:1 or 2:1)
   *
   * @param {string} phase - Current training phase
   * @param {number} weeks - Number of weeks in phase
   * @param {string} recoverySpeed - Athlete's recovery speed
   * @returns {Array} Weekly loading pattern
   */
  generateMicroCycles(phase, weeks, recoverySpeed = 'average') {
    // Determine pattern based on recovery speed
    let pattern;

    if (recoverySpeed === 'slow') {
      pattern = [2, 1]; // 2 hard weeks, 1 recovery week
    } else if (recoverySpeed === 'fast' && phase === 'base') {
      pattern = [4, 1]; // 4 hard weeks, 1 recovery for fast recoverers in base
    } else {
      pattern = [3, 1]; // Standard 3:1 pattern
    }

    return this.generatePattern(pattern, weeks);
  }

  /**
   * Generate repeating loading pattern
   */
  generatePattern(pattern, totalWeeks) {
    const result = [];
    const cycleLength = pattern.reduce((sum, val) => sum + val, 0);
    let weekIndex = 0;

    while (weekIndex < totalWeeks) {
      for (let i = 0; i < pattern.length && weekIndex < totalWeeks; i++) {
        const weeksInBlock = pattern[i];
        const isRecoveryBlock = (i === pattern.length - 1);

        for (let w = 0; w < weeksInBlock && weekIndex < totalWeeks; w++) {
          result.push({
            weekNumber: weekIndex + 1,
            loadType: isRecoveryBlock ? 'RECOVERY' : 'BUILD',
            relativeIntensity: isRecoveryBlock ? 0.7 : 1.0
          });
          weekIndex++;
        }
      }
    }

    return result;
  }

  /**
   * Get phase for a specific week number
   */
  getPhaseForWeek(weekNumber, phases) {
    if (weekNumber <= phases.base) return 'base';
    if (weekNumber <= phases.base + phases.build) return 'build';
    if (weekNumber <= phases.base + phases.build + phases.peak) return 'peak';
    return 'taper';
  }

  /**
   * Get phase characteristics (intensity distribution, focus)
   */
  getPhaseCharacteristics(phase) {
    const characteristics = {
      base: {
        intensityDistribution: { easy: 0.85, moderate: 0.10, hard: 0.05 },
        focus: 'Aerobic base building, volume accumulation',
        primaryWorkouts: ['long_run', 'easy_run'],
        weeklyIntensitySessions: 1,
        longRunProgression: 1.10 // 10% increase per week
      },
      build: {
        intensityDistribution: { easy: 0.75, moderate: 0.15, hard: 0.10 },
        focus: 'Threshold development, lactate tolerance',
        primaryWorkouts: ['tempo', 'long_run', 'easy_run'],
        weeklyIntensitySessions: 2,
        longRunProgression: 1.08 // 8% increase per week
      },
      peak: {
        intensityDistribution: { easy: 0.65, moderate: 0.20, hard: 0.15 },
        focus: 'Race-specific intensity, VO2max development',
        primaryWorkouts: ['intervals', 'tempo', 'long_run'],
        weeklyIntensitySessions: 2,
        longRunProgression: 1.05 // 5% increase per week
      },
      taper: {
        intensityDistribution: { easy: 0.80, moderate: 0.15, hard: 0.05 },
        focus: 'Recovery and freshness, maintain sharpness',
        primaryWorkouts: ['easy_run', 'short_tempo'],
        weeklyIntensitySessions: 1,
        longRunProgression: 0.70 // 30% reduction
      }
    };

    return characteristics[phase] || characteristics.build;
  }

  /**
   * Calculate weekly volume based on phase and progression
   */
  calculateWeeklyVolume(weekNumber, phase, baseVolume, microCycle) {
    const phaseCharacteristics = this.getPhaseCharacteristics(phase);
    const weeklyProgression = phaseCharacteristics.longRunProgression;

    // Base volume with phase-specific progression
    let volume = baseVolume * Math.pow(weeklyProgression, weekNumber - 1);

    // Apply micro-cycle adjustment
    if (microCycle.loadType === 'RECOVERY') {
      volume *= 0.7; // 30% reduction for recovery weeks
    }

    // Cap volume growth
    const maxVolume = baseVolume * 2.5; // Max 2.5x starting volume
    volume = Math.min(volume, maxVolume);

    return Math.round(volume);
  }

  /**
   * Generate complete periodization schedule
   */
  async generatePeriodizationSchedule(totalWeeks, raceDistance, baseVolume, recoverySpeed = 'average') {
    const phases = await this.calculateOptimalPhases(totalWeeks, raceDistance);

    const schedule = [];

    for (let week = 1; week <= totalWeeks; week++) {
      const phase = this.getPhaseForWeek(week, phases);
      const phaseWeek = this.getPhaseWeek(week, phases);
      const characteristics = this.getPhaseCharacteristics(phase);

      // Get micro-cycle pattern for this phase
      const phaseDuration = phases[phase];
      const microCycles = this.generateMicroCycles(phase, phaseDuration, recoverySpeed);
      const microCycle = microCycles[phaseWeek - 1] || { loadType: 'BUILD', relativeIntensity: 1.0 };

      // Calculate volume
      const weeklyVolume = this.calculateWeeklyVolume(week, phase, baseVolume, microCycle);

      schedule.push({
        weekNumber: week,
        phase,
        phaseWeek,
        microCycle: microCycle.loadType,
        weeklyVolume,
        intensityDistribution: characteristics.intensityDistribution,
        focus: characteristics.focus,
        primaryWorkouts: characteristics.primaryWorkouts,
        intensitySessions: characteristics.weeklyIntensitySessions
      });
    }

    return {
      schedule,
      phases,
      summary: {
        totalWeeks,
        raceDistance,
        baseVolume,
        peakVolume: Math.max(...schedule.map(s => s.weeklyVolume)),
        recoverySpeed
      }
    };
  }

  /**
   * Get week number within current phase
   */
  getPhaseWeek(weekNumber, phases) {
    if (weekNumber <= phases.base) return weekNumber;
    if (weekNumber <= phases.base + phases.build) return weekNumber - phases.base;
    if (weekNumber <= phases.base + phases.build + phases.peak) {
      return weekNumber - phases.base - phases.build;
    }
    return weekNumber - phases.base - phases.build - phases.peak;
  }
}

module.exports = { AdaptivePeriodization };
