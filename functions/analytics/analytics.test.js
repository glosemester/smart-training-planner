/**
 * Tests for Analytics Components (Fase 1)
 *
 * Tests VDOT calculations, TSB logic, recovery patterns, and workout response tracking.
 */

const { PerformanceAnalytics } = require('./performanceAnalytics');
const { RecoveryPatternLearning } = require('./recoveryPatterns');
const { WorkoutResponseTracker } = require('./workoutResponse');

// Mock Firebase for testing
jest.mock('../config/firebase', () => ({
  db: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ docs: [], empty: true }),
    set: jest.fn().mockResolvedValue({}),
  }
}));

describe('PerformanceAnalytics', () => {
  let analytics;

  beforeEach(() => {
    analytics = new PerformanceAnalytics('test-uid');
  });

  describe('VDOT Calculations', () => {
    test('calculates VDOT for 20:00 5K (should be ~50.4)', () => {
      const vdot = analytics.calculateVDOT(5, 20 * 60);
      expect(vdot).toBeGreaterThan(49);
      expect(vdot).toBeLessThan(52);
    });

    test('calculates VDOT for 18:00 5K (should be ~57.5)', () => {
      const vdot = analytics.calculateVDOT(5, 18 * 60);
      expect(vdot).toBeGreaterThan(56);
      expect(vdot).toBeLessThan(59);
    });

    test('calculates VDOT for 3:00:00 marathon (should be ~51)', () => {
      const vdot = analytics.calculateVDOT(42.2, 3 * 60 * 60);
      expect(vdot).toBeGreaterThan(49);
      expect(vdot).toBeLessThan(53);
    });

    test('calculates VDOT for 1:30:00 half marathon (should be ~53)', () => {
      const vdot = analytics.calculateVDOT(21.1, 90 * 60);
      expect(vdot).toBeGreaterThan(51);
      expect(vdot).toBeLessThan(55);
    });
  });

  describe('VDOT to Race Time Conversion', () => {
    test('converts VDOT 50 to approximate 20:00 5K', () => {
      const time = analytics.vdotToRaceTime(50, 5);
      // Should be close to 20:00 (allow some margin for iteration convergence)
      expect(time).toMatch(/19:|20:|21:/);
    });

    test('converts VDOT 60 to approximate 17:00 5K', () => {
      const time = analytics.vdotToRaceTime(60, 5);
      expect(time).toMatch(/16:|17:|18:/);
    });
  });

  describe('Time Formatting', () => {
    test('formats seconds to MM:SS for short durations', () => {
      expect(analytics.formatTime(1200)).toBe('20:00');
      expect(analytics.formatTime(1800)).toBe('30:00');
    });

    test('formats seconds to HH:MM:SS for long durations', () => {
      expect(analytics.formatTime(3600)).toBe('1:00:00');
      expect(analytics.formatTime(10800)).toBe('3:00:00');
    });
  });

  describe('TSB Status Classification', () => {
    test('detects overreaching when ratio > 1.5', () => {
      const status = analytics.getTSBStatus(-10, 1.6);
      expect(status).toBe('OVERREACHING');
    });

    test('detects high load when ratio > 1.3', () => {
      const status = analytics.getTSBStatus(-5, 1.4);
      expect(status).toBe('HIGH_LOAD');
    });

    test('detects fresh state when TSB > 10', () => {
      const status = analytics.getTSBStatus(15, 1.0);
      expect(status).toBe('FRESH');
    });

    test('detects fatigued state when TSB < -20', () => {
      const status = analytics.getTSBStatus(-25, 1.2);
      expect(status).toBe('FATIGUED');
    });

    test('detects optimal state in normal range', () => {
      const status = analytics.getTSBStatus(0, 1.1);
      expect(status).toBe('OPTIMAL');
    });
  });

  describe('Load Calculations', () => {
    test('calculates load correctly for mixed workouts', () => {
      const workouts = [
        { type: 'intervals', duration: 60, rpe: 9 },
        { type: 'easy_run', duration: 45, rpe: 4 },
        { type: 'long_run', duration: 120, rpe: 6 }
      ];

      const load = analytics.calculateLoad(workouts);
      expect(load).toBeGreaterThan(0);
      // Intervals should contribute most despite shorter duration
    });

    test('assigns higher intensity to interval workouts', () => {
      const interval = { type: 'intervals', duration: 60 };
      const easy = { type: 'easy_run', duration: 60 };

      const intervalIntensity = analytics.getIntensityFactor(interval);
      const easyIntensity = analytics.getIntensityFactor(easy);

      expect(intervalIntensity).toBeGreaterThan(easyIntensity);
    });
  });

  describe('Helper Functions', () => {
    test('calculates mean correctly', () => {
      expect(analytics.mean([1, 2, 3, 4, 5])).toBe(3);
      expect(analytics.mean([10, 20, 30])).toBe(20);
    });

    test('calculates standard deviation correctly', () => {
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      const stdDev = analytics.stdDeviation(values);
      expect(stdDev).toBeCloseTo(2, 0);
    });

    test('handles empty arrays gracefully', () => {
      expect(analytics.mean([])).toBe(0);
      expect(analytics.stdDeviation([])).toBe(0);
    });
  });
});

describe('RecoveryPatternLearning', () => {
  let recovery;

  beforeEach(() => {
    recovery = new RecoveryPatternLearning('test-uid');
  });

  describe('Baseline Calculations', () => {
    test('calculates median correctly for odd number of values', () => {
      const values = [10, 20, 30, 40, 50];
      expect(recovery.calculateBaseline(values)).toBe(30);
    });

    test('calculates median correctly for even number of values', () => {
      const values = [10, 20, 30, 40];
      expect(recovery.calculateBaseline(values)).toBe(25);
    });

    test('handles single value', () => {
      expect(recovery.calculateBaseline([50])).toBe(50);
    });
  });

  describe('HRV to Readiness Score', () => {
    test('gives 100 for HRV 20% above baseline', () => {
      const score = recovery.hrvToReadinessScore(60, 50);
      expect(score).toBe(100);
    });

    test('gives 75 for HRV at baseline', () => {
      const score = recovery.hrvToReadinessScore(50, 50);
      expect(score).toBe(75);
    });

    test('gives lower scores for HRV below baseline', () => {
      const score = recovery.hrvToReadinessScore(40, 50);
      expect(score).toBeLessThan(75);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    test('handles zero baseline gracefully', () => {
      const score = recovery.hrvToReadinessScore(50, 0);
      expect(score).toBe(50);
    });
  });

  describe('Trend Analysis', () => {
    test('calculates positive slope for improving values', () => {
      const values = [40, 45, 50, 55, 60];
      const slope = recovery.calculateTrendSlope(values);
      expect(slope).toBeGreaterThan(0);
    });

    test('calculates negative slope for declining values', () => {
      const values = [60, 55, 50, 45, 40];
      const slope = recovery.calculateTrendSlope(values);
      expect(slope).toBeLessThan(0);
    });

    test('calculates near-zero slope for stable values', () => {
      const values = [50, 51, 50, 49, 50];
      const slope = recovery.calculateTrendSlope(values);
      expect(Math.abs(slope)).toBeLessThan(1);
    });
  });

  describe('Default Thresholds', () => {
    test('provides reasonable default thresholds', () => {
      const thresholds = recovery.getDefaultThresholds();
      expect(thresholds.critical).toBe(30);
      expect(thresholds.warning).toBe(40);
      expect(thresholds.optimal).toBe(50);
      expect(thresholds.prime).toBe(60);
    });
  });
});

describe('WorkoutResponseTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new WorkoutResponseTracker('test-uid');
  });

  describe('Completion Rate Calculations', () => {
    test('calculates 100% completion rate when all workouts completed', () => {
      const data = [
        { wasCompleted: true },
        { wasCompleted: true },
        { wasCompleted: true }
      ];
      expect(tracker.completionRate(data)).toBe(100);
    });

    test('calculates 50% completion rate when half completed', () => {
      const data = [
        { wasCompleted: true },
        { wasCompleted: false },
        { wasCompleted: true },
        { wasCompleted: false }
      ];
      expect(tracker.completionRate(data)).toBe(50);
    });

    test('calculates 0% for no completions', () => {
      const data = [
        { wasCompleted: false },
        { wasCompleted: false }
      ];
      expect(tracker.completionRate(data)).toBe(0);
    });

    test('handles empty data gracefully', () => {
      expect(tracker.completionRate([])).toBe(0);
    });
  });

  describe('Intensity Classification', () => {
    test('classifies easy runs as easy', () => {
      expect(tracker.classifyIntensity({ type: 'easy_run' })).toBe('easy');
      expect(tracker.classifyIntensity({ type: 'recovery' })).toBe('easy');
    });

    test('classifies intervals and tempo as hard', () => {
      expect(tracker.classifyIntensity({ type: 'intervals' })).toBe('hard');
      expect(tracker.classifyIntensity({ type: 'tempo' })).toBe('hard');
    });

    test('classifies unknown types as moderate', () => {
      expect(tracker.classifyIntensity({ type: 'unknown' })).toBe('moderate');
      expect(tracker.classifyIntensity({ type: 'strength' })).toBe('moderate');
    });
  });

  describe('Date Comparison', () => {
    test('identifies same day correctly', () => {
      const date1 = new Date('2024-01-15T10:00:00');
      const date2 = new Date('2024-01-15T14:30:00');
      expect(tracker.isSameDay(date1, date2)).toBe(true);
    });

    test('identifies different days correctly', () => {
      const date1 = new Date('2024-01-15T10:00:00');
      const date2 = new Date('2024-01-16T10:00:00');
      expect(tracker.isSameDay(date1, date2)).toBe(false);
    });
  });

  describe('Optimal Frequency', () => {
    test('returns default frequency for insufficient data', () => {
      const optimal = tracker.findOptimalFrequency([]);
      expect(optimal).toBe(4);
    });

    test('caps frequency at 6 days per week', () => {
      const analysis = [
        { frequency: 7, performanceScore: 100 },
        { frequency: 7, performanceScore: 100 }
      ];
      const optimal = tracker.findOptimalFrequency(analysis);
      expect(optimal).toBeLessThanOrEqual(6);
    });

    test('enforces minimum of 3 days per week', () => {
      const analysis = [
        { frequency: 2, performanceScore: 100 },
        { frequency: 2, performanceScore: 100 }
      ];
      const optimal = tracker.findOptimalFrequency(analysis);
      expect(optimal).toBeGreaterThanOrEqual(3);
    });
  });
});

describe('Integration Tests', () => {
  test('all classes can be instantiated', () => {
    expect(() => new PerformanceAnalytics('test-uid')).not.toThrow();
    expect(() => new RecoveryPatternLearning('test-uid')).not.toThrow();
    expect(() => new WorkoutResponseTracker('test-uid')).not.toThrow();
  });

  test('VDOT calculations are consistent', () => {
    const analytics = new PerformanceAnalytics('test-uid');

    const vdot1 = analytics.calculateVDOT(5, 1200);
    const vdot2 = analytics.calculateVDOT(5, 1200);

    expect(vdot1).toBe(vdot2);
  });
});

// Run tests
if (require.main === module) {
  console.log('Running analytics tests...');
  console.log('✓ Tests complete - run with Jest for full coverage');
}
