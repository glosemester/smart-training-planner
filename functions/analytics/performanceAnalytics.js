/**
 * Performance Analytics - Tracking athlete progression
 *
 * Implements VDOT calculations, Training Stress Balance (TSB),
 * monotony detection, and fitness progression predictions.
 */

const { db } = require('../config/firebase');
const { Timestamp } = require('firebase-admin/firestore');

class PerformanceAnalytics {
  constructor(uid) {
    this.uid = uid;
  }

  /**
   * Calculate VDOT from race performance
   * Uses Jack Daniels' Running Formula
   *
   * @param {number} distanceKm - Distance in kilometers
   * @param {number} timeSeconds - Time in seconds
   * @returns {number} VDOT value
   */
  calculateVDOT(distanceKm, timeSeconds) {
    const velocity = (distanceKm * 1000) / (timeSeconds / 60); // m/min

    // Daniels' VDOT formula
    const vo2 = -4.60 + 0.182258 * velocity + 0.000104 * Math.pow(velocity, 2);
    const percentVO2max = 0.8 + 0.1894393 * Math.exp(-0.012778 * (timeSeconds / 60)) +
                          0.2989558 * Math.exp(-0.1932605 * (timeSeconds / 60));

    return vo2 / percentVO2max;
  }

  /**
   * Convert VDOT to race time for a given distance
   * Inverse of VDOT calculation
   *
   * @param {number} vdot - VDOT value
   * @param {number} distanceKm - Distance in kilometers
   * @returns {string} Race time formatted as "HH:MM:SS"
   */
  vdotToRaceTime(vdot, distanceKm) {
    // Iterative approach to find time that produces the given VDOT
    let timeSeconds = distanceKm * 300; // Initial guess: 5 min/km pace
    let iterations = 0;
    const maxIterations = 100;

    while (iterations < maxIterations) {
      const calculatedVDOT = this.calculateVDOT(distanceKm, timeSeconds);
      const error = calculatedVDOT - vdot;

      if (Math.abs(error) < 0.1) break;

      // Adjust time based on error
      timeSeconds -= error * 10;
      iterations++;
    }

    return this.formatTime(timeSeconds);
  }

  /**
   * Format seconds to HH:MM:SS or MM:SS
   */
  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
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
   * Calculate training load for a set of workouts
   * Load = duration * intensity factor
   */
  calculateLoad(workouts) {
    return workouts.reduce((total, workout) => {
      const duration = workout.duration || 0; // minutes
      const intensity = this.getIntensityFactor(workout);
      return total + (duration * intensity);
    }, 0);
  }

  /**
   * Get intensity factor based on workout type and RPE
   */
  getIntensityFactor(workout) {
    // Base intensity by type
    const typeIntensity = {
      'intervals': 2.0,
      'tempo': 1.5,
      'long_run': 1.2,
      'easy_run': 1.0,
      'recovery': 0.5,
      'strength': 1.3,
      'rest': 0
    };

    let intensity = typeIntensity[workout.type] || 1.0;

    // Adjust by RPE if available
    if (workout.rpe) {
      intensity *= (workout.rpe / 5); // Scale to RPE (1-10 scale)
    }

    return intensity;
  }

  /**
   * Track training stress balance (TSB) over time
   * Formula: TSB = Chronic Load - Acute Load
   *
   * Chronic Load = 28-day average (fitness)
   * Acute Load = 7-day average (fatigue)
   *
   * @returns {Object} TSB data with status and recommendations
   */
  async calculateTSB() {
    const workouts = await this.getWorkouts(42); // Last 6 weeks

    if (workouts.length < 7) {
      return {
        tsb: 0,
        ratio: 1.0,
        status: 'INSUFFICIENT_DATA',
        recommendation: 'Need at least 1 week of training data'
      };
    }

    const last7Days = workouts.filter(w => {
      const daysAgo = (new Date() - w.date) / (1000 * 60 * 60 * 24);
      return daysAgo <= 7;
    });

    const last28Days = workouts.filter(w => {
      const daysAgo = (new Date() - w.date) / (1000 * 60 * 60 * 24);
      return daysAgo <= 28;
    });

    const acuteLoad = this.calculateLoad(last7Days);
    const chronicLoad = last28Days.length > 0 ? this.calculateLoad(last28Days) / 4 : 0;

    const tsb = chronicLoad - acuteLoad;
    const ratio = chronicLoad > 0 ? acuteLoad / chronicLoad : 1.0;

    return {
      tsb,
      ratio,
      acuteLoad,
      chronicLoad,
      status: this.getTSBStatus(tsb, ratio),
      recommendation: this.getTSBRecommendation(tsb, ratio)
    };
  }

  /**
   * Get TSB status based on values
   */
  getTSBStatus(tsb, ratio) {
    if (ratio > 1.5) return 'OVERREACHING'; // Overtraining risk
    if (ratio > 1.3) return 'HIGH_LOAD';
    if (ratio < 0.8) return 'DETRAINING'; // Losing fitness
    if (tsb > 10) return 'FRESH'; // Ready to race
    if (tsb < -20) return 'FATIGUED';
    return 'OPTIMAL';
  }

  /**
   * Get TSB recommendation based on status
   */
  getTSBRecommendation(tsb, ratio) {
    if (ratio > 1.5) {
      return 'High injury risk. Reduce training volume or take extra rest days.';
    }
    if (ratio > 1.3) {
      return 'Training load is high. Monitor recovery closely and consider a lighter week.';
    }
    if (ratio < 0.8) {
      return 'Training load is low. You may be detraining. Consider increasing volume if recovered.';
    }
    if (tsb > 10) {
      return 'You are well-rested and fresh. Good time for a race or hard workout.';
    }
    if (tsb < -20) {
      return 'You are carrying significant fatigue. Prioritize recovery and easy training.';
    }
    return 'Training load is balanced. Continue current approach.';
  }

  /**
   * Detect training monotony (low variance = injury risk)
   * Formula: Monotony = Average Weekly Load / Std Dev
   *
   * @returns {Object} Monotony data with risk level
   */
  async calculateMonotony() {
    const workouts = await this.getWorkouts(42); // 6 weeks

    if (workouts.length < 14) {
      return {
        monotony: 0,
        risk: 'INSUFFICIENT_DATA'
      };
    }

    const weeklyLoads = this.groupByWeek(workouts);

    if (weeklyLoads.length < 2) {
      return {
        monotony: 0,
        risk: 'INSUFFICIENT_DATA'
      };
    }

    const avgLoad = this.mean(weeklyLoads);
    const stdDev = this.stdDeviation(weeklyLoads);

    if (stdDev === 0) {
      return {
        monotony: 0,
        risk: 'HIGH',
        recommendation: 'No variation in training load. Add variety to prevent injury.'
      };
    }

    const monotony = avgLoad / stdDev;

    return {
      monotony,
      risk: monotony > 2.0 ? 'HIGH' : monotony > 1.5 ? 'MODERATE' : 'LOW',
      recommendation: this.getMonotonyRecommendation(monotony)
    };
  }

  /**
   * Get monotony recommendation
   */
  getMonotonyRecommendation(monotony) {
    if (monotony > 2.0) {
      return 'High monotony detected. Add variety: mix easy days, hard intervals, and recovery weeks.';
    }
    if (monotony > 1.5) {
      return 'Moderate monotony. Consider adding more variation to your training loads.';
    }
    return 'Good training variety. Continue mixing different intensities and volumes.';
  }

  /**
   * Group workouts by week and calculate weekly loads
   */
  groupByWeek(workouts) {
    const weeks = {};

    workouts.forEach(workout => {
      const weekStart = this.getWeekStart(workout.date);
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeks[weekKey]) {
        weeks[weekKey] = [];
      }
      weeks[weekKey].push(workout);
    });

    return Object.values(weeks).map(weekWorkouts =>
      this.calculateLoad(weekWorkouts)
    );
  }

  /**
   * Get the start of the week (Monday) for a given date
   */
  getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    return new Date(d.setDate(diff));
  }

  /**
   * Calculate mean of an array
   */
  mean(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Calculate standard deviation of an array
   */
  stdDeviation(values) {
    if (values.length < 2) return 0;

    const avg = this.mean(values);
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = this.mean(squareDiffs);

    return Math.sqrt(avgSquareDiff);
  }

  /**
   * Get current VDOT from recent race or workout performance
   */
  async getCurrentVDOT() {
    // Try to get from recent race results
    const raceDoc = await db
      .collection('users')
      .doc(this.uid)
      .collection('races')
      .orderBy('date', 'desc')
      .limit(1)
      .get();

    if (!raceDoc.empty) {
      const race = raceDoc.docs[0].data();
      if (race.distance && race.time) {
        return this.calculateVDOT(race.distance, race.time);
      }
    }

    // Estimate from recent workouts if no race data
    const workouts = await this.getWorkouts(30);
    const tempoRuns = workouts.filter(w => w.type === 'tempo' || w.type === 'intervals');

    if (tempoRuns.length > 0) {
      // Estimate VDOT from tempo pace
      const avgPace = this.mean(tempoRuns.map(w => w.pace || 0));
      if (avgPace > 0) {
        // Tempo pace is roughly 88% of VO2max, estimate VDOT
        const estimatedVDOT = 50 - (avgPace - 4) * 5; // Rough estimation
        return Math.max(30, Math.min(85, estimatedVDOT));
      }
    }

    // Default to moderate fitness level
    return 45;
  }

  /**
   * Predict fitness progression curve
   * Uses exponential adaptation model
   *
   * @param {number} weeks - Number of weeks to project
   * @returns {Array} Weekly fitness projections
   */
  async predictFitness(weeks) {
    const currentVDOT = await this.getCurrentVDOT();
    const weeklyGain = 0.005; // 0.5% per week (conservative)

    return Array.from({ length: weeks }, (_, i) => {
      const week = i + 1;
      const adaptationRate = Math.exp(-week / 12); // Diminishing returns
      const projectedVDOT = currentVDOT * (1 + weeklyGain * adaptationRate * week);

      return {
        week,
        vdot: projectedVDOT,
        estimated5K: this.vdotToRaceTime(projectedVDOT, 5),
        estimated10K: this.vdotToRaceTime(projectedVDOT, 10),
        estimatedHalfMarathon: this.vdotToRaceTime(projectedVDOT, 21.1),
        estimatedMarathon: this.vdotToRaceTime(projectedVDOT, 42.2)
      };
    });
  }

  /**
   * Assess experience level based on training history
   */
  async assessExperienceLevel() {
    const workouts = await this.getWorkouts(365); // Last year

    if (workouts.length < 50) return 'beginner';
    if (workouts.length < 150) return 'intermediate';
    return 'advanced';
  }

  /**
   * Calculate fitness gap for race distance
   */
  async getFitnessGap(raceDistance, targetTime) {
    const currentVDOT = await this.getCurrentVDOT();
    const targetVDOT = this.calculateVDOT(raceDistance, targetTime);

    return {
      currentVDOT,
      targetVDOT,
      gap: targetVDOT - currentVDOT,
      feasible: targetVDOT - currentVDOT < 10 // More than 10 VDOT points is very ambitious
    };
  }
}

module.exports = { PerformanceAnalytics };
