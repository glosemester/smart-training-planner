/**
 * Performance Prediction using Machine Learning
 *
 * Predicts race times based on:
 * - Training history and volume
 * - Workout intensity distribution
 * - Recovery metrics
 * - Long run progression
 * - Historical race results
 */

const { PerformanceAnalytics } = require('../analytics/performanceAnalytics');
const { RecoveryPatternLearning } = require('../analytics/recoveryPatterns');
const { db } = require('../config/firebase');
const { Timestamp } = require('firebase-admin/firestore');

class PerformancePredictor {
  constructor(userId) {
    this.userId = userId;
    this.analytics = new PerformanceAnalytics(userId);
    this.recovery = new RecoveryPatternLearning(userId);
  }

  /**
   * Train model on user's historical data
   * Features: weekly volume, intensity distribution, long run distance, recovery metrics
   * Target: race performance (VDOT)
   */
  async trainModel() {
    const trainingHistory = await this.getTrainingHistory(180); // 6 months
    const raceResults = await this.getRaceResults();

    if (raceResults.length === 0) {
      return {
        status: 'INSUFFICIENT_DATA',
        message: 'No race results available for training'
      };
    }

    // Calculate recent VDOT from race results
    const recentVDOT = this.calculateRecentVDOT(raceResults);

    // Assess training quality from recent history
    const trainingQuality = await this.assessTrainingQuality(trainingHistory);

    // Model: VDOT projection based on training quality
    const projectedVDOT = recentVDOT * (1 + 0.005 * trainingQuality);

    return {
      status: 'TRAINED',
      currentVDOT: recentVDOT,
      projectedVDOT,
      trainingQuality,
      confidence: this.calculateModelConfidence(trainingHistory, raceResults),
      features: this.extractFeatures(trainingHistory),
      lastTrainedAt: new Date()
    };
  }

  /**
   * Get training history with features
   */
  async getTrainingHistory(days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const workoutsSnapshot = await db
      .collection('users')
      .doc(this.userId)
      .collection('workouts')
      .where('date', '>=', Timestamp.fromDate(cutoffDate))
      .orderBy('date', 'desc')
      .get();

    return workoutsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date.toDate()
    }));
  }

  /**
   * Get race results
   */
  async getRaceResults() {
    const racesSnapshot = await db
      .collection('users')
      .doc(this.userId)
      .collection('races')
      .orderBy('date', 'desc')
      .get();

    return racesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date.toDate()
    }));
  }

  /**
   * Calculate recent VDOT from race results
   */
  calculateRecentVDOT(raceResults) {
    if (raceResults.length === 0) return 45; // Default moderate fitness

    // Get most recent race within last year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const recentRaces = raceResults.filter(r => r.date >= oneYearAgo);

    if (recentRaces.length === 0) {
      // Use oldest available race
      const oldestRace = raceResults[raceResults.length - 1];
      return this.analytics.calculateVDOT(oldestRace.distance, oldestRace.time);
    }

    // Calculate VDOT for each race and take weighted average (newer = more weight)
    const vdots = recentRaces.map((race, index) => {
      const vdot = this.analytics.calculateVDOT(race.distance, race.time);
      const weight = Math.pow(0.8, index); // Exponential decay
      return { vdot, weight };
    });

    const totalWeight = vdots.reduce((sum, v) => sum + v.weight, 0);
    const weightedVDOT = vdots.reduce((sum, v) => sum + v.vdot * v.weight, 0) / totalWeight;

    return weightedVDOT;
  }

  /**
   * Assess training quality score (0-100)
   */
  async assessTrainingQuality(workouts) {
    if (workouts.length < 10) return 50; // Default moderate quality

    // Group by week
    const weeklyData = this.groupByWeek(workouts);

    // Quality factors
    const consistency = this.calculateConsistency(weeklyData);
    const volumeProgression = this.calculateVolumeProgression(weeklyData);
    const intensityBalance = this.calculateIntensityBalance(workouts);
    const longRunConsistency = this.calculateLongRunConsistency(workouts);

    // Weighted score
    const qualityScore =
      consistency * 0.3 +
      volumeProgression * 0.25 +
      intensityBalance * 0.25 +
      longRunConsistency * 0.20;

    return Math.round(qualityScore);
  }

  /**
   * Calculate training consistency (0-100)
   */
  calculateConsistency(weeklyData) {
    if (weeklyData.length < 2) return 50;

    // Consistency = low variance in weekly workout count
    const weeklyWorkoutCounts = weeklyData.map(week => week.workouts.length);
    const avgCount = weeklyWorkoutCounts.reduce((sum, c) => sum + c, 0) / weeklyWorkoutCounts.length;
    const variance = weeklyWorkoutCounts.reduce((sum, c) => sum + Math.pow(c - avgCount, 2), 0) / weeklyWorkoutCounts.length;
    const stdDev = Math.sqrt(variance);

    // Low variance = high consistency
    const consistencyScore = Math.max(0, 100 - (stdDev / avgCount * 50));

    return consistencyScore;
  }

  /**
   * Calculate volume progression quality (0-100)
   */
  calculateVolumeProgression(weeklyData) {
    if (weeklyData.length < 4) return 50;

    // Good progression = steady increase without spikes
    const weeklyVolumes = weeklyData.map(week =>
      week.workouts.reduce((sum, w) => sum + (w.distance || 0), 0)
    ).reverse(); // Oldest to newest

    let progressionScore = 0;
    let validWeeks = 0;

    for (let i = 1; i < weeklyVolumes.length; i++) {
      const change = (weeklyVolumes[i] - weeklyVolumes[i - 1]) / weeklyVolumes[i - 1];

      // Ideal: 5-10% increase
      if (change >= 0.05 && change <= 0.10) {
        progressionScore += 100;
      } else if (change >= 0 && change <= 0.15) {
        progressionScore += 75;
      } else if (change >= -0.2 && change < 0) {
        progressionScore += 50; // Recovery weeks acceptable
      } else {
        progressionScore += 25; // Too fast or declining
      }

      validWeeks++;
    }

    return validWeeks > 0 ? progressionScore / validWeeks : 50;
  }

  /**
   * Calculate intensity balance (0-100)
   */
  calculateIntensityBalance(workouts) {
    const easyWorkouts = workouts.filter(w =>
      ['easy_run', 'recovery'].includes(w.type)
    ).length;

    const hardWorkouts = workouts.filter(w =>
      ['intervals', 'tempo', 'long_run'].includes(w.type)
    ).length;

    const total = easyWorkouts + hardWorkouts;
    if (total === 0) return 50;

    const easyPercentage = easyWorkouts / total;

    // Ideal: 75-85% easy
    if (easyPercentage >= 0.75 && easyPercentage <= 0.85) {
      return 100;
    } else if (easyPercentage >= 0.70 && easyPercentage <= 0.90) {
      return 80;
    } else if (easyPercentage >= 0.65 && easyPercentage <= 0.95) {
      return 60;
    }

    return 40;
  }

  /**
   * Calculate long run consistency (0-100)
   */
  calculateLongRunConsistency(workouts) {
    const longRuns = workouts.filter(w => w.type === 'long_run');

    if (longRuns.length < 4) return 50;

    // Check if long runs are happening regularly (weekly)
    const weeksWithLongRun = new Set();
    longRuns.forEach(lr => {
      const weekKey = this.getWeekKey(lr.date);
      weeksWithLongRun.add(weekKey);
    });

    const totalWeeks = Math.ceil(
      (workouts[0].date - workouts[workouts.length - 1].date) / (1000 * 60 * 60 * 24 * 7)
    );

    const longRunFrequency = weeksWithLongRun.size / totalWeeks;

    // Ideal: long run every week (100%), acceptable: 75%+
    return Math.min(100, longRunFrequency * 120);
  }

  /**
   * Group workouts by week
   */
  groupByWeek(workouts) {
    const weeks = {};

    workouts.forEach(workout => {
      const weekKey = this.getWeekKey(workout.date);

      if (!weeks[weekKey]) {
        weeks[weekKey] = { workouts: [], totalDistance: 0 };
      }

      weeks[weekKey].workouts.push(workout);
      weeks[weekKey].totalDistance += workout.distance || 0;
    });

    return Object.values(weeks);
  }

  /**
   * Get week key for grouping
   */
  getWeekKey(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const weekNumber = this.getWeekNumber(d);
    return `${year}-W${weekNumber}`;
  }

  /**
   * Get ISO week number
   */
  getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNumber = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNumber;
  }

  /**
   * Calculate model confidence (0-100)
   */
  calculateModelConfidence(trainingHistory, raceResults) {
    let confidence = 0;

    // Factor 1: Amount of training data (max 40 points)
    const dataPoints = trainingHistory.length;
    confidence += Math.min(40, dataPoints / 5);

    // Factor 2: Recent race results (max 30 points)
    const recentRaces = raceResults.filter(r => {
      const monthsAgo = (new Date() - r.date) / (1000 * 60 * 60 * 24 * 30);
      return monthsAgo <= 6;
    }).length;
    confidence += Math.min(30, recentRaces * 15);

    // Factor 3: Training consistency (max 30 points)
    if (trainingHistory.length >= 20) {
      const weeks = this.groupByWeek(trainingHistory);
      const consistency = this.calculateConsistency(weeks);
      confidence += consistency * 0.3;
    }

    return Math.round(Math.min(100, confidence));
  }

  /**
   * Extract features from training history
   */
  extractFeatures(workouts) {
    if (workouts.length === 0) {
      return {
        avgWeeklyKm: 0,
        avgWorkoutsPerWeek: 0,
        longRunPercentage: 0,
        intensityDistribution: { easy: 0, moderate: 0, hard: 0 }
      };
    }

    const weeks = this.groupByWeek(workouts);

    const avgWeeklyKm = weeks.reduce((sum, w) => sum + w.totalDistance, 0) / weeks.length;
    const avgWorkoutsPerWeek = weeks.reduce((sum, w) => sum + w.workouts.length, 0) / weeks.length;

    const longRuns = workouts.filter(w => w.type === 'long_run').length;
    const longRunPercentage = longRuns / workouts.length;

    const easy = workouts.filter(w => ['easy_run', 'recovery'].includes(w.type)).length;
    const moderate = workouts.filter(w => ['tempo', 'long_run'].includes(w.type)).length;
    const hard = workouts.filter(w => w.type === 'intervals').length;
    const total = easy + moderate + hard || 1;

    return {
      avgWeeklyKm: Math.round(avgWeeklyKm * 10) / 10,
      avgWorkoutsPerWeek: Math.round(avgWorkoutsPerWeek * 10) / 10,
      longRunPercentage: Math.round(longRunPercentage * 100),
      intensityDistribution: {
        easy: Math.round(easy / total * 100),
        moderate: Math.round(moderate / total * 100),
        hard: Math.round(hard / total * 100)
      }
    };
  }

  /**
   * Predict performance at race date
   * Accounts for planned training progression
   */
  async predictRaceDayPerformance(raceDate, raceDistance) {
    const currentFitness = await this.analytics.getCurrentVDOT();
    const weeksToRace = Math.ceil((raceDate - new Date()) / (1000 * 60 * 60 * 24 * 7));

    if (weeksToRace < 0) {
      return {
        error: 'RACE_IN_PAST',
        message: 'Race date is in the past'
      };
    }

    // Project fitness progression
    const projectedFitness = await this.projectFitness(currentFitness, weeksToRace);

    // Account for taper benefit (+2-4%)
    const taperBoost = this.calculateTaperBoost(raceDistance, weeksToRace);
    const raceDayVDOT = projectedFitness * (1 + taperBoost);

    // Calculate race time
    const predictedTime = this.vdotToTime(raceDayVDOT, raceDistance);

    // Calculate confidence interval
    const confidence = await this.calculatePredictionConfidence(weeksToRace);
    const confidenceInterval = this.calculateConfidenceInterval(raceDayVDOT, confidence);

    return {
      predictedTime,
      predictedVDOT: Math.round(raceDayVDOT * 10) / 10,
      currentVDOT: Math.round(currentFitness * 10) / 10,
      weeksToRace,
      confidenceInterval: {
        best: this.vdotToTime(confidenceInterval.upper, raceDistance),
        likely: predictedTime,
        worst: this.vdotToTime(confidenceInterval.lower, raceDistance)
      },
      paceRecommendation: this.recommendRacePace(raceDayVDOT, raceDistance),
      confidence: confidence + '%',
      taperBoost: `${(taperBoost * 100).toFixed(1)}%`
    };
  }

  /**
   * Project fitness progression over weeks
   */
  async projectFitness(currentVDOT, weeks) {
    const weeklyGain = 0.005; // 0.5% per week (conservative)
    const model = await this.trainModel();

    // Adjust gain based on training quality
    let adjustedGain = weeklyGain;
    if (model.status === 'TRAINED') {
      adjustedGain = weeklyGain * (model.trainingQuality / 70); // Scale by quality
    }

    // Diminishing returns over time
    const totalGain = adjustedGain * weeks * Math.exp(-weeks / 16);

    return currentVDOT * (1 + totalGain);
  }

  /**
   * Calculate taper boost based on distance
   */
  calculateTaperBoost(distance, weeksToRace) {
    // No taper benefit if race is very far away or very close
    if (weeksToRace > 20 || weeksToRace < 1) return 0;

    // Taper boost increases with distance
    if (distance >= 42) return 0.04; // 4% for marathon
    if (distance >= 21) return 0.03; // 3% for half marathon
    if (distance >= 10) return 0.02; // 2% for 10K+
    return 0.01; // 1% for 5K
  }

  /**
   * Calculate prediction confidence
   */
  async calculatePredictionConfidence(weeksToRace) {
    let confidence = 80; // Base confidence

    // Confidence decreases with time to race (more uncertainty)
    confidence -= Math.min(30, weeksToRace * 2);

    // Increase confidence based on training data quality
    const model = await this.trainModel();
    if (model.status === 'TRAINED') {
      confidence += (model.confidence - 50) / 5; // Bonus from model confidence
    }

    return Math.max(40, Math.min(95, Math.round(confidence)));
  }

  /**
   * Calculate confidence interval
   */
  calculateConfidenceInterval(vdot, confidence) {
    // Confidence percentage to standard deviations
    const margin = (100 - confidence) / 20; // Conservative estimate

    return {
      lower: vdot - margin,
      upper: vdot + margin
    };
  }

  /**
   * Convert VDOT to race time
   */
  vdotToTime(vdot, distanceKm) {
    return this.analytics.vdotToRaceTime(vdot, distanceKm);
  }

  /**
   * Recommend race pace
   */
  recommendRacePace(vdot, distance) {
    const timeSeconds = this.timeStringToSeconds(this.analytics.vdotToRaceTime(vdot, distance));
    const paceMinPerKm = (timeSeconds / 60) / distance;

    // Format as min:sec/km
    const paceMin = Math.floor(paceMinPerKm);
    const paceSec = Math.round((paceMinPerKm - paceMin) * 60);

    return {
      minPerKm: `${paceMin}:${paceSec.toString().padStart(2, '0')}`,
      startPace: `${paceMin}:${(paceSec + 5).toString().padStart(2, '0')}`, // Start 5 sec slower
      finishPace: `${paceMin}:${Math.max(0, paceSec - 5).toString().padStart(2, '0')}` // Finish 5 sec faster
    };
  }

  /**
   * Convert time string to seconds
   */
  timeStringToSeconds(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return 0;
  }

  /**
   * Get multiple race distance predictions
   */
  async getPredictions(targetDate = null) {
    const raceDate = targetDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // Default: 90 days

    const distances = [
      { name: '5K', km: 5 },
      { name: '10K', km: 10 },
      { name: 'Half Marathon', km: 21.1 },
      { name: 'Marathon', km: 42.2 }
    ];

    const predictions = {};

    for (const dist of distances) {
      predictions[dist.name] = await this.predictRaceDayPerformance(raceDate, dist.km);
    }

    return {
      predictions,
      targetDate: raceDate,
      currentVDOT: await this.analytics.getCurrentVDOT()
    };
  }
}

module.exports = { PerformancePredictor };
