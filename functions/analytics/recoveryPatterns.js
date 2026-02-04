/**
 * Recovery Pattern Learning - Individual recovery curves
 *
 * Learns athlete-specific HRV patterns and recovery speed.
 * Builds personalized recovery thresholds over time.
 */

const { db } = require('../config/firebase');
const { Timestamp } = require('firebase-admin/firestore');

class RecoveryPatternLearning {
  constructor(uid) {
    this.uid = uid;
  }

  /**
   * Get recovery data (Whoop) for the last N days
   */
  async getRecoveryHistory(days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recoverySnapshot = await db
      .collection('users')
      .doc(this.uid)
      .collection('whoop_data')
      .where('date', '>=', Timestamp.fromDate(cutoffDate))
      .orderBy('date', 'desc')
      .get();

    return recoverySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        date: data.date.toDate(),
        hrv: data.recovery?.hrv_rmssd || data.hrv || 0,
        recovery: data.recovery?.recovery_score || data.recoveryScore || 0,
        strain: data.strain?.day_strain || data.dayStrain || 0,
        sleep: data.sleep?.score || data.sleepScore || 0,
        rhr: data.recovery?.resting_heart_rate || data.rhr || 0
      };
    });
  }

  /**
   * Learn individual HRV recovery patterns
   * Builds personalized recovery thresholds over time
   *
   * @returns {Object} Personalized recovery profile
   */
  async learnRecoveryPattern() {
    const recoveryData = await this.getRecoveryHistory(90); // 3 months

    if (recoveryData.length < 7) {
      return {
        baseline: 0,
        stdDev: 0,
        thresholds: this.getDefaultThresholds(),
        recoverySpeed: 'average',
        confidence: 0,
        dataPoints: recoveryData.length,
        status: 'INSUFFICIENT_DATA'
      };
    }

    // Filter out zero/invalid HRV values
    const validData = recoveryData.filter(d => d.hrv > 0);

    if (validData.length < 7) {
      return {
        baseline: 0,
        stdDev: 0,
        thresholds: this.getDefaultThresholds(),
        recoverySpeed: 'average',
        confidence: 0,
        dataPoints: validData.length,
        status: 'INSUFFICIENT_DATA'
      };
    }

    // Calculate personalized HRV baseline
    const hrvValues = validData.map(d => d.hrv);
    const hrvBaseline = this.calculateBaseline(hrvValues);
    const hrvStdDev = this.stdDeviation(hrvValues);

    // Identify recovery speed (how quickly HRV returns after hard workouts)
    const recoverySpeed = await this.calculateRecoverySpeed(validData);

    // Calculate confidence based on data quantity and consistency
    const confidence = Math.min(validData.length / 90, 1.0);

    // Build adaptive thresholds
    const thresholds = {
      critical: Math.max(0, hrvBaseline - (2 * hrvStdDev)),  // -2 SD
      warning: Math.max(0, hrvBaseline - hrvStdDev),          // -1 SD
      optimal: hrvBaseline,                                    // baseline
      prime: hrvBaseline + hrvStdDev                           // +1 SD
    };

    return {
      baseline: hrvBaseline,
      stdDev: hrvStdDev,
      thresholds,
      recoverySpeed,
      confidence,
      dataPoints: validData.length,
      status: 'LEARNED',
      lastUpdated: new Date()
    };
  }

  /**
   * Get default thresholds for new users
   */
  getDefaultThresholds() {
    return {
      critical: 30,
      warning: 40,
      optimal: 50,
      prime: 60
    };
  }

  /**
   * Calculate baseline using median (more robust than mean)
   */
  calculateBaseline(values) {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  /**
   * Calculate standard deviation
   */
  stdDeviation(values) {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / values.length;

    return Math.sqrt(avgSquareDiff);
  }

  /**
   * Detect recovery speed from workout → recovery patterns
   * Analyzes how quickly HRV returns to baseline after hard efforts
   */
  async calculateRecoverySpeed(recoveryData) {
    // Get workouts from the same period
    const workouts = await this.getWorkouts(90);

    if (workouts.length < 5) {
      return 'average'; // Default if insufficient workout data
    }

    // Find hard workouts (RPE ≥ 8 or high intensity)
    const hardWorkouts = workouts.filter(w =>
      (w.rpe && w.rpe >= 8) ||
      w.type === 'intervals' ||
      w.type === 'tempo'
    );

    if (hardWorkouts.length < 3) {
      return 'average';
    }

    // Measure time to return to baseline HRV for each hard workout
    const recoveryTimes = hardWorkouts
      .map(workout => this.daysToBaselineRecovery(workout, recoveryData))
      .filter(time => time !== null);

    if (recoveryTimes.length === 0) {
      return 'average';
    }

    const avgRecoveryTime = recoveryTimes.reduce((sum, t) => sum + t, 0) / recoveryTimes.length;

    // Classify recovery speed
    if (avgRecoveryTime < 1.5) return 'fast';
    if (avgRecoveryTime < 2.5) return 'average';
    return 'slow';
  }

  /**
   * Get workouts for the last N days
   */
  async getWorkouts(days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const workoutsSnapshot = await db
      .collection('users')
      .doc(this.uid)
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
   * Calculate days to return to baseline HRV after a hard workout
   */
  daysToBaselineRecovery(workout, recoveryData) {
    const workoutDate = workout.date;
    const baseline = this.calculateBaseline(recoveryData.map(d => d.hrv));

    // Look at recovery data for 7 days after the workout
    const subsequentRecovery = recoveryData.filter(d => {
      const daysDiff = (d.date - workoutDate) / (1000 * 60 * 60 * 24);
      return daysDiff > 0 && daysDiff <= 7;
    }).sort((a, b) => a.date - b.date);

    if (subsequentRecovery.length === 0) return null;

    // Find first day HRV returns to >= 95% of baseline
    const targetHRV = baseline * 0.95;

    for (let i = 0; i < subsequentRecovery.length; i++) {
      if (subsequentRecovery[i].hrv >= targetHRV) {
        return (subsequentRecovery[i].date - workoutDate) / (1000 * 60 * 60 * 24);
      }
    }

    // If never recovered within 7 days, return 7
    return 7;
  }

  /**
   * Predict readiness for tomorrow based on trend
   * Uses exponential weighted moving average
   */
  async predictTomorrowReadiness(recentData = null) {
    if (!recentData) {
      const allData = await this.getRecoveryHistory(7);
      recentData = allData.slice(0, 4); // Last 4 days
    }

    if (recentData.length < 2) {
      return {
        predictedHRV: 0,
        predictedRecovery: 0,
        confidence: 0,
        status: 'INSUFFICIENT_DATA'
      };
    }

    // Weights: today most important
    const weights = [0.4, 0.3, 0.2, 0.1];

    let predictedHRV = 0;
    let predictedRecovery = 0;

    recentData.slice(0, 4).forEach((day, i) => {
      if (i < weights.length) {
        predictedHRV += day.hrv * weights[i];
        predictedRecovery += day.recovery * weights[i];
      }
    });

    // Get personalized thresholds
    const pattern = await this.learnRecoveryPattern();

    return {
      predictedHRV,
      predictedRecovery,
      readinessScore: this.hrvToReadinessScore(predictedHRV, pattern.baseline),
      confidence: pattern.confidence,
      status: predictedHRV >= pattern.thresholds.optimal ? 'READY' :
              predictedHRV >= pattern.thresholds.warning ? 'MODERATE' : 'LOW'
    };
  }

  /**
   * Convert HRV to readiness score (0-100)
   */
  hrvToReadinessScore(hrv, baseline) {
    if (baseline === 0) return 50; // Default middle score

    const ratio = hrv / baseline;

    // Map ratio to 0-100 scale
    // ratio >= 1.2 → 100 (prime condition)
    // ratio = 1.0 → 75 (baseline)
    // ratio = 0.8 → 50 (warning)
    // ratio = 0.6 → 25 (critical)
    // ratio < 0.5 → 0 (very low)

    if (ratio >= 1.2) return 100;
    if (ratio >= 1.0) return 75 + ((ratio - 1.0) / 0.2) * 25;
    if (ratio >= 0.8) return 50 + ((ratio - 0.8) / 0.2) * 25;
    if (ratio >= 0.6) return 25 + ((ratio - 0.6) / 0.2) * 25;
    if (ratio >= 0.5) return ((ratio - 0.5) / 0.1) * 25;
    return 0;
  }

  /**
   * Analyze recovery trend over recent days
   */
  async analyzeRecoveryTrend(days = 7) {
    const recoveryData = await this.getRecoveryHistory(days);

    if (recoveryData.length < 3) {
      return {
        trend: 'UNKNOWN',
        confidence: 0
      };
    }

    const hrvValues = recoveryData.map(d => d.hrv).reverse(); // Oldest to newest

    // Simple linear regression to detect trend
    const slope = this.calculateTrendSlope(hrvValues);

    // Classify trend
    let trend;
    if (slope > 1) {
      trend = 'IMPROVING'; // HRV increasing
    } else if (slope < -1) {
      trend = 'DECLINING'; // HRV decreasing
    } else {
      trend = 'STABLE';
    }

    return {
      trend,
      slope,
      confidence: Math.min(recoveryData.length / days, 1.0),
      dataPoints: recoveryData.length
    };
  }

  /**
   * Calculate trend slope (simple linear regression)
   */
  calculateTrendSlope(values) {
    const n = values.length;
    if (n < 2) return 0;

    const indices = Array.from({ length: n }, (_, i) => i);
    const meanX = indices.reduce((sum, i) => sum + i, 0) / n;
    const meanY = values.reduce((sum, v) => sum + v, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (indices[i] - meanX) * (values[i] - meanY);
      denominator += Math.pow(indices[i] - meanX, 2);
    }

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Get personalized recovery recommendation
   */
  async getRecoveryRecommendation() {
    const pattern = await this.learnRecoveryPattern();
    const recentData = await this.getRecoveryHistory(7);

    if (recentData.length === 0) {
      return {
        recommendation: 'No recovery data available. Connect Whoop to get personalized insights.',
        intensity: 'moderate'
      };
    }

    const latestHRV = recentData[0].hrv;
    const latestRecovery = recentData[0].recovery;

    // Compare to personal thresholds
    if (latestHRV < pattern.thresholds.critical || latestRecovery < 33) {
      return {
        recommendation: 'Critical recovery state. Take a full rest day or very light active recovery.',
        intensity: 'rest',
        reason: 'HRV well below personal baseline'
      };
    }

    if (latestHRV < pattern.thresholds.warning || latestRecovery < 50) {
      return {
        recommendation: 'Low recovery. Stick to easy training or consider a rest day.',
        intensity: 'easy',
        reason: 'HRV below personal baseline'
      };
    }

    if (latestHRV >= pattern.thresholds.prime && latestRecovery >= 85) {
      return {
        recommendation: 'Excellent recovery! Great day for a hard workout or long run.',
        intensity: 'high',
        reason: 'HRV above personal baseline'
      };
    }

    return {
      recommendation: 'Good recovery. Can handle moderate to hard training.',
      intensity: 'moderate',
      reason: 'HRV near personal baseline'
    };
  }

  /**
   * Save learned pattern to user profile
   */
  async saveRecoveryPattern() {
    const pattern = await this.learnRecoveryPattern();

    if (pattern.status === 'LEARNED') {
      await db.collection('users').doc(this.uid).set(
        {
          recoveryPattern: {
            ...pattern,
            lastUpdated: Timestamp.now()
          }
        },
        { merge: true }
      );

      return { success: true, pattern };
    }

    return { success: false, reason: 'Insufficient data' };
  }

  /**
   * Load saved recovery pattern from user profile
   */
  async loadRecoveryPattern() {
    const userDoc = await db.collection('users').doc(this.uid).get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData.recoveryPattern) {
        return userData.recoveryPattern;
      }
    }

    // If no saved pattern, learn a new one
    return await this.learnRecoveryPattern();
  }
}

module.exports = { RecoveryPatternLearning };
