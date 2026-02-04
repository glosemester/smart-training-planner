/**
 * Workout Response Tracking - What works for this athlete?
 *
 * Analyzes adherence patterns, workout effectiveness, and optimal training frequency.
 * Helps identify which workouts produce best results for individual athletes.
 */

const { db } = require('../config/firebase');
const { Timestamp } = require('firebase-admin/firestore');

class WorkoutResponseTracker {
  constructor(uid) {
    this.uid = uid;
  }

  /**
   * Get planned vs completed workouts
   */
  async getPlannedVsCompleted(days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Get training plan
    const planSnapshot = await db
      .collection('users')
      .doc(this.uid)
      .collection('training_plan')
      .where('date', '>=', Timestamp.fromDate(cutoffDate))
      .get();

    // Get completed workouts
    const completedSnapshot = await db
      .collection('users')
      .doc(this.uid)
      .collection('workouts')
      .where('date', '>=', Timestamp.fromDate(cutoffDate))
      .get();

    const planned = planSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date.toDate()
    }));

    const completed = completedSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date.toDate()
    }));

    // Match planned with completed
    return planned.map(plan => {
      const match = completed.find(comp =>
        this.isSameDay(comp.date, plan.date)
      );

      return {
        planned: plan,
        completed: match || null,
        wasCompleted: !!match,
        wasSkipped: !match,
        date: plan.date
      };
    });
  }

  /**
   * Check if two dates are the same day
   */
  isSameDay(date1, date2) {
    return date1.toDateString() === date2.toDateString();
  }

  /**
   * Track adherence patterns - hvilke workouts skips brukeren?
   *
   * @returns {Object} Comprehensive adherence analysis
   */
  async analyzeAdherence() {
    const plannedVsCompleted = await this.getPlannedVsCompleted(90);

    if (plannedVsCompleted.length === 0) {
      return {
        overallCompletionRate: 0,
        status: 'NO_DATA',
        message: 'No training plan data available'
      };
    }

    const analysis = {
      overallCompletionRate: this.completionRate(plannedVsCompleted),
      byType: this.completionRateByType(plannedVsCompleted),
      byDay: this.completionRateByDay(plannedVsCompleted),
      byIntensity: this.completionRateByIntensity(plannedVsCompleted),
      skipPatterns: this.detectSkipPatterns(plannedVsCompleted),
      insights: []
    };

    // Generate insights
    analysis.insights = this.generateAdherenceInsights(analysis);

    return analysis;
  }

  /**
   * Calculate overall completion rate
   */
  completionRate(data) {
    if (data.length === 0) return 0;
    const completed = data.filter(d => d.wasCompleted).length;
    return (completed / data.length) * 100;
  }

  /**
   * Calculate completion rate by workout type
   */
  completionRateByType(data) {
    const types = {};

    data.forEach(item => {
      const type = item.planned.type || 'unknown';
      if (!types[type]) {
        types[type] = { planned: 0, completed: 0 };
      }
      types[type].planned++;
      if (item.wasCompleted) {
        types[type].completed++;
      }
    });

    // Calculate percentages
    Object.keys(types).forEach(type => {
      types[type].rate = (types[type].completed / types[type].planned) * 100;
    });

    return types;
  }

  /**
   * Calculate completion rate by day of week
   */
  completionRateByDay(data) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayStats = {};

    days.forEach(day => {
      dayStats[day] = { planned: 0, completed: 0 };
    });

    data.forEach(item => {
      const dayName = days[item.date.getDay()];
      dayStats[dayName].planned++;
      if (item.wasCompleted) {
        dayStats[dayName].completed++;
      }
    });

    // Calculate percentages
    Object.keys(dayStats).forEach(day => {
      if (dayStats[day].planned > 0) {
        dayStats[day].rate = (dayStats[day].completed / dayStats[day].planned) * 100;
      } else {
        dayStats[day].rate = 0;
      }
    });

    return dayStats;
  }

  /**
   * Calculate completion rate by intensity level
   */
  completionRateByIntensity(data) {
    const intensities = {
      easy: { planned: 0, completed: 0 },
      moderate: { planned: 0, completed: 0 },
      hard: { planned: 0, completed: 0 }
    };

    data.forEach(item => {
      const intensity = this.classifyIntensity(item.planned);
      intensities[intensity].planned++;
      if (item.wasCompleted) {
        intensities[intensity].completed++;
      }
    });

    // Calculate percentages
    Object.keys(intensities).forEach(level => {
      if (intensities[level].planned > 0) {
        intensities[level].rate = (intensities[level].completed / intensities[level].planned) * 100;
      } else {
        intensities[level].rate = 0;
      }
    });

    return intensities;
  }

  /**
   * Classify workout intensity
   */
  classifyIntensity(workout) {
    const easyTypes = ['easy_run', 'recovery', 'rest'];
    const hardTypes = ['intervals', 'tempo', 'long_run'];

    if (easyTypes.includes(workout.type)) return 'easy';
    if (hardTypes.includes(workout.type)) return 'hard';
    return 'moderate';
  }

  /**
   * Detect skip patterns
   */
  detectSkipPatterns(data) {
    const patterns = [];

    // Pattern 1: Consecutive skips
    let consecutiveSkips = 0;
    let maxConsecutiveSkips = 0;

    data.forEach(item => {
      if (item.wasSkipped) {
        consecutiveSkips++;
        maxConsecutiveSkips = Math.max(maxConsecutiveSkips, consecutiveSkips);
      } else {
        consecutiveSkips = 0;
      }
    });

    if (maxConsecutiveSkips >= 3) {
      patterns.push({
        type: 'CONSECUTIVE_SKIPS',
        severity: 'HIGH',
        description: `Skipped ${maxConsecutiveSkips} consecutive workouts`
      });
    }

    // Pattern 2: Long workout avoidance
    const longWorkouts = data.filter(d =>
      d.planned.duration && d.planned.duration > 90
    );
    if (longWorkouts.length > 0) {
      const longWorkoutCompletion = this.completionRate(longWorkouts);
      if (longWorkoutCompletion < 50) {
        patterns.push({
          type: 'LONG_WORKOUT_AVOIDANCE',
          severity: 'MODERATE',
          description: `Only completes ${longWorkoutCompletion.toFixed(0)}% of long workouts (>90min)`
        });
      }
    }

    // Pattern 3: Weekend warrior (only trains on weekends)
    const weekdayWorkouts = data.filter(d =>
      d.date.getDay() >= 1 && d.date.getDay() <= 5
    );
    const weekendWorkouts = data.filter(d =>
      d.date.getDay() === 0 || d.date.getDay() === 6
    );

    if (weekdayWorkouts.length > 0 && weekendWorkouts.length > 0) {
      const weekdayRate = this.completionRate(weekdayWorkouts);
      const weekendRate = this.completionRate(weekendWorkouts);

      if (weekendRate > 70 && weekdayRate < 30) {
        patterns.push({
          type: 'WEEKEND_WARRIOR',
          severity: 'MODERATE',
          description: 'Primarily trains on weekends, skips most weekday workouts'
        });
      }
    }

    return patterns;
  }

  /**
   * Generate actionable insights from adherence data
   */
  generateAdherenceInsights(analysis) {
    const insights = [];

    // Overall adherence insight
    if (analysis.overallCompletionRate < 50) {
      insights.push({
        type: 'LOW_ADHERENCE',
        message: 'Training adherence is low. Consider reducing training volume or frequency.',
        action: 'REDUCE_VOLUME'
      });
    } else if (analysis.overallCompletionRate > 85) {
      insights.push({
        type: 'HIGH_ADHERENCE',
        message: 'Excellent training adherence! You\'re consistently following your plan.',
        action: 'MAINTAIN'
      });
    }

    // Type-specific insights
    Object.entries(analysis.byType).forEach(([type, stats]) => {
      if (stats.rate < 40 && stats.planned >= 5) {
        insights.push({
          type: 'TYPE_AVOIDANCE',
          message: `You skip ${type} workouts ${(100 - stats.rate).toFixed(0)}% of the time. Consider reducing frequency or finding alternatives.`,
          action: `REDUCE_${type.toUpperCase()}_FREQUENCY`
        });
      }
    });

    // Day-specific insights
    const worstDay = Object.entries(analysis.byDay)
      .filter(([_, stats]) => stats.planned >= 3)
      .sort((a, b) => a[1].rate - b[1].rate)[0];

    if (worstDay && worstDay[1].rate < 30) {
      insights.push({
        type: 'DAY_AVOIDANCE',
        message: `${worstDay[0]} is your least consistent training day. Avoid scheduling key workouts on this day.`,
        action: `AVOID_${worstDay[0].toUpperCase()}`
      });
    }

    // Intensity insights
    if (analysis.byIntensity.hard.rate < 50 && analysis.byIntensity.hard.planned >= 5) {
      insights.push({
        type: 'INTENSITY_AVOIDANCE',
        message: 'You often skip hard workouts. Consider reducing intensity or frequency of high-intensity sessions.',
        action: 'REDUCE_INTENSITY'
      });
    }

    return insights;
  }

  /**
   * Measure workout effectiveness - hva gir best respons?
   *
   * @returns {Object} Workout type effectiveness rankings
   */
  async measureWorkoutEffectiveness() {
    const workouts = await this.getWorkoutsWithSubsequentPerformance(180);

    if (workouts.length < 10) {
      return {
        status: 'INSUFFICIENT_DATA',
        message: 'Need more workout history to measure effectiveness'
      };
    }

    // Group workouts by type and measure performance improvement
    const effectiveness = {
      long_run: await this.correlateWithFitness(workouts, 'long_run'),
      intervals: await this.correlateWithFitness(workouts, 'intervals'),
      tempo: await this.correlateWithFitness(workouts, 'tempo'),
      strength: await this.correlateWithFitness(workouts, 'strength')
    };

    // Rank workout types by effectiveness for THIS athlete
    const ranked = this.rankByEffectiveness(effectiveness);

    return {
      effectiveness,
      ranked,
      recommendation: this.generateEffectivenessRecommendation(ranked)
    };
  }

  /**
   * Get workouts with subsequent performance data
   */
  async getWorkoutsWithSubsequentPerformance(days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const workoutsSnapshot = await db
      .collection('users')
      .doc(this.uid)
      .collection('workouts')
      .where('date', '>=', Timestamp.fromDate(cutoffDate))
      .orderBy('date', 'asc')
      .get();

    return workoutsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date.toDate()
    }));
  }

  /**
   * Correlate workout type with fitness improvements
   */
  async correlateWithFitness(workouts, workoutType) {
    const typeWorkouts = workouts.filter(w => w.type === workoutType);

    if (typeWorkouts.length < 3) {
      return {
        correlation: 0,
        sampleSize: typeWorkouts.length,
        confidence: 'LOW'
      };
    }

    // Simple measure: average pace improvement over time
    const paceImprovements = [];

    typeWorkouts.forEach((workout, index) => {
      if (index > 0 && workout.pace && typeWorkouts[index - 1].pace) {
        const improvement = typeWorkouts[index - 1].pace - workout.pace; // Lower pace = better
        paceImprovements.push(improvement);
      }
    });

    if (paceImprovements.length === 0) {
      return {
        correlation: 0,
        sampleSize: typeWorkouts.length,
        confidence: 'LOW'
      };
    }

    const avgImprovement = paceImprovements.reduce((sum, i) => sum + i, 0) / paceImprovements.length;

    return {
      correlation: avgImprovement,
      sampleSize: typeWorkouts.length,
      confidence: typeWorkouts.length >= 10 ? 'HIGH' : typeWorkouts.length >= 5 ? 'MODERATE' : 'LOW',
      avgImprovement: avgImprovement * 60 // Convert to seconds per km
    };
  }

  /**
   * Rank workout types by effectiveness
   */
  rankByEffectiveness(effectiveness) {
    return Object.entries(effectiveness)
      .filter(([_, data]) => data.confidence !== 'LOW')
      .sort((a, b) => b[1].correlation - a[1].correlation)
      .map(([type, data]) => ({
        type,
        score: data.correlation,
        confidence: data.confidence
      }));
  }

  /**
   * Generate effectiveness recommendation
   */
  generateEffectivenessRecommendation(ranked) {
    if (ranked.length === 0) {
      return 'Need more training data to determine most effective workouts';
    }

    const best = ranked[0];
    const worst = ranked[ranked.length - 1];

    return `${best.type} workouts appear most effective for you. Consider prioritizing these. ${worst.type} shows less impact - consider reducing frequency.`;
  }

  /**
   * Calculate optimal training frequency for this athlete
   *
   * @returns {Object} Optimal frequency recommendations
   */
  async calculateOptimalFrequency() {
    const workouts = await this.getWorkoutsWithSubsequentPerformance(180);

    if (workouts.length < 20) {
      return {
        recommendedDaysPerWeek: 4,
        confidence: 'LOW',
        reason: 'Insufficient data, using default recommendation'
      };
    }

    // Group by week and analyze performance vs frequency
    const weeklyData = this.groupWorkoutsByWeek(workouts);

    // Find sweet spot: max performance, min injury/fatigue indicators
    const analysis = weeklyData.map(week => ({
      frequency: week.workouts.length,
      totalLoad: week.totalLoad,
      avgRecovery: week.avgRecovery,
      performanceScore: this.calculateWeekPerformanceScore(week)
    }));

    // Find optimal frequency
    const optimalFrequency = this.findOptimalFrequency(analysis);

    return {
      recommendedDaysPerWeek: optimalFrequency,
      restDaysNeeded: 7 - optimalFrequency,
      confidence: 'MODERATE',
      analysis: this.generateFrequencyInsights(analysis, optimalFrequency)
    };
  }

  /**
   * Group workouts by week
   */
  groupWorkoutsByWeek(workouts) {
    const weeks = {};

    workouts.forEach(workout => {
      const weekStart = this.getWeekStart(workout.date);
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeks[weekKey]) {
        weeks[weekKey] = {
          workouts: [],
          totalLoad: 0,
          avgRecovery: 0
        };
      }

      weeks[weekKey].workouts.push(workout);
      weeks[weekKey].totalLoad += workout.duration || 0;
    });

    return Object.values(weeks);
  }

  /**
   * Get the start of the week (Monday)
   */
  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  /**
   * Calculate performance score for a week
   */
  calculateWeekPerformanceScore(week) {
    // Simple scoring: consistency + load + quality
    const consistencyScore = Math.min(week.workouts.length / 5, 1) * 40;
    const loadScore = Math.min(week.totalLoad / 300, 1) * 40; // 300 min = max
    const qualityScore = 20; // Placeholder

    return consistencyScore + loadScore + qualityScore;
  }

  /**
   * Find optimal frequency based on performance analysis
   */
  findOptimalFrequency(analysis) {
    if (analysis.length === 0) return 4;

    // Group by frequency and find best performing
    const frequencyGroups = {};

    analysis.forEach(week => {
      const freq = week.frequency;
      if (!frequencyGroups[freq]) {
        frequencyGroups[freq] = { scores: [], count: 0 };
      }
      frequencyGroups[freq].scores.push(week.performanceScore);
      frequencyGroups[freq].count++;
    });

    // Calculate average score per frequency
    let bestFrequency = 4;
    let bestScore = 0;

    Object.entries(frequencyGroups).forEach(([freq, data]) => {
      if (data.count >= 2) { // Need at least 2 weeks of data
        const avgScore = data.scores.reduce((sum, s) => sum + s, 0) / data.count;
        if (avgScore > bestScore) {
          bestScore = avgScore;
          bestFrequency = parseInt(freq);
        }
      }
    });

    // Cap at reasonable range (3-6 days/week)
    return Math.max(3, Math.min(6, bestFrequency));
  }

  /**
   * Generate frequency insights
   */
  generateFrequencyInsights(analysis, optimalFrequency) {
    return `Based on your training history, ${optimalFrequency} workouts per week appears optimal for you. This balances performance gains with recovery needs.`;
  }

  /**
   * Save adherence analysis to user profile
   */
  async saveAdherenceProfile() {
    const adherence = await this.analyzeAdherence();
    const effectiveness = await this.measureWorkoutEffectiveness();
    const frequency = await this.calculateOptimalFrequency();

    await db.collection('users').doc(this.uid).set(
      {
        workoutResponse: {
          adherence,
          effectiveness,
          frequency,
          lastUpdated: Timestamp.now()
        }
      },
      { merge: true }
    );

    return { success: true, adherence, effectiveness, frequency };
  }
}

module.exports = { WorkoutResponseTracker };
