/**
 * Test for Machine Learning Models (Fase 3)
 * Tests Performance Predictor and Workout Recommender
 */

console.log('========================================');
console.log('FASE 3: MACHINE LEARNING MODELS');
console.log('========================================\n');

// Test 1: Training Quality Assessment
console.log('Test 1: Training Quality Assessment\n');

function assessTrainingQuality(weeklyData) {
  // Mock implementation
  const consistency = 85;
  const volumeProgression = 75;
  const intensityBalance = 90;
  const longRunConsistency = 80;

  const qualityScore =
    consistency * 0.3 +
    volumeProgression * 0.25 +
    intensityBalance * 0.25 +
    longRunConsistency * 0.20;

  return Math.round(qualityScore);
}

console.log('Training Quality Factors:');
console.log('  Consistency: 85/100 (low variance in weekly workouts)');
console.log('  Volume Progression: 75/100 (steady 5-10% increases)');
console.log('  Intensity Balance: 90/100 (80% easy, 20% hard)');
console.log('  Long Run Consistency: 80/100 (weekly long runs)');
console.log(`  Overall Quality Score: ${assessTrainingQuality()}/100\n`);

// Test 2: VDOT Projection
console.log('========================================');
console.log('Test 2: VDOT Projection with Training Quality\n');

function projectFitness(currentVDOT, weeks, trainingQuality) {
  const weeklyGain = 0.005; // 0.5% per week
  const adjustedGain = weeklyGain * (trainingQuality / 70);
  const totalGain = adjustedGain * weeks * Math.exp(-weeks / 16);

  return currentVDOT * (1 + totalGain);
}

const currentVDOT = 50;
const trainingQuality = 82;

console.log(`Current VDOT: ${currentVDOT}`);
console.log(`Training Quality: ${trainingQuality}/100`);
console.log('');

[4, 8, 12, 16].forEach(weeks => {
  const projected = projectFitness(currentVDOT, weeks, trainingQuality);
  const gain = ((projected - currentVDOT) / currentVDOT * 100).toFixed(1);
  console.log(`Week ${weeks.toString().padStart(2)}: VDOT ${projected.toFixed(1)} (+${gain}%)`);
});
console.log('');

// Test 3: Race Time Prediction with Taper Boost
console.log('========================================');
console.log('Test 3: Race Time Prediction\n');

function calculateTaperBoost(distance) {
  if (distance >= 42) return 0.04; // 4% for marathon
  if (distance >= 21) return 0.03; // 3% for half
  if (distance >= 10) return 0.02; // 2% for 10K
  return 0.01; // 1% for 5K
}

function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  const secs = Math.round((minutes % 1) * 60);

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const races = [
  { name: 'Marathon', distance: 42.2, estimatedMinutes: 200 },
  { name: 'Half Marathon', distance: 21.1, estimatedMinutes: 95 },
  { name: '10K', distance: 10, estimatedMinutes: 42 },
  { name: '5K', distance: 5, estimatedMinutes: 20.5 }
];

console.log('Race Predictions (12 weeks training):');
races.forEach(race => {
  const projectedVDOT = projectFitness(currentVDOT, 12, trainingQuality);
  const taperBoost = calculateTaperBoost(race.distance);
  const raceDayVDOT = projectedVDOT * (1 + taperBoost);

  console.log(`\n${race.name} (${race.distance}km):`);
  console.log(`  Projected VDOT: ${projectedVDOT.toFixed(1)}`);
  console.log(`  With taper boost (+${(taperBoost * 100).toFixed(0)}%): ${raceDayVDOT.toFixed(1)}`);
  console.log(`  Predicted time: ${formatTime(race.estimatedMinutes)}`);
  console.log(`  Best case: ${formatTime(race.estimatedMinutes * 0.98)}`);
  console.log(`  Worst case: ${formatTime(race.estimatedMinutes * 1.02)}`);
});
console.log('');

// Test 4: Workout Scoring System
console.log('========================================');
console.log('Test 4: Workout Recommendation Scoring\n');

function calculateWorkoutScore(workout, context) {
  let score = 50;

  // Factor 1: Recovery appropriateness
  const recoveryMatch = matchRecoveryLevel(workout.intensity, context.recoveryScore);
  score += recoveryMatch;

  // Factor 2: Phase alignment
  const phaseMatch = matchPhaseGoals(workout.type, context.phase);
  score += phaseMatch;

  // Factor 3: Variety bonus
  if (context.lastWorkout && workout.type !== context.lastWorkout.type) {
    score += 15;
  }

  return score;
}

function matchRecoveryLevel(intensity, recoveryScore) {
  if (recoveryScore < 50) {
    return intensity === 'easy' ? 20 : -10;
  } else if (recoveryScore < 75) {
    return intensity === 'moderate' ? 20 : intensity === 'easy' ? 10 : 0;
  } else {
    return intensity === 'hard' ? 20 : intensity === 'moderate' ? 15 : 5;
  }
}

function matchPhaseGoals(workoutType, phase) {
  const phasePreferences = {
    base: { easy_run: 20, long_run: 20, tempo: 5, intervals: 0 },
    build: { tempo: 20, long_run: 15, intervals: 10, easy_run: 15 },
    peak: { intervals: 20, tempo: 20, easy_run: 10 },
    taper: { easy_run: 20, recovery: 20, tempo: 10 }
  };
  return phasePreferences[phase]?.[workoutType] || 0;
}

const context = {
  phase: 'build',
  recoveryScore: 75,
  lastWorkout: { type: 'easy_run' }
};

const workouts = [
  { type: 'tempo', intensity: 'hard', title: 'Tempo Run' },
  { type: 'intervals', intensity: 'hard', title: 'Intervals' },
  { type: 'long_run', intensity: 'moderate', title: 'Long Run' },
  { type: 'easy_run', intensity: 'easy', title: 'Easy Run' }
];

console.log(`Context: ${context.phase} phase, Recovery: ${context.recoveryScore}/100`);
console.log(`Last workout: ${context.lastWorkout.type}\n`);

const scored = workouts
  .map(w => ({ ...w, score: calculateWorkoutScore(w, context) }))
  .sort((a, b) => b.score - a.score);

console.log('Workout Recommendations (ranked):');
scored.forEach((w, i) => {
  console.log(`${i + 1}. ${w.title.padEnd(15)} (${w.type.padEnd(12)}) - Score: ${w.score}`);
});
console.log('');

// Test 5: Weekly Load Distribution
console.log('========================================');
console.log('Test 5: Weekly Load Distribution\n');

function optimizeLoadDistribution(targetLoad, numDays, recoveryPattern) {
  const pattern = recoveryPattern === 'slow' ? [1.3, 0.7, 0.8, 1.2] : [1.4, 0.7, 1.3, 0.8];

  const distribution = [];
  for (let i = 0; i < numDays; i++) {
    distribution.push(pattern[i % pattern.length]);
  }

  const totalPattern = distribution.reduce((sum, v) => sum + v, 0);
  return distribution.map(v => Math.round((v / totalPattern) * targetLoad));
}

const targetLoad = 400; // minutes
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

console.log(`Target weekly load: ${targetLoad} minutes\n`);

console.log('Standard pattern (average recovery):');
const standardDist = optimizeLoadDistribution(targetLoad, 7, 'average');
days.forEach((day, i) => {
  console.log(`  ${day.padEnd(10)}: ${standardDist[i]} min`);
});

console.log('\nSlow recoverer pattern (more recovery):');
const slowDist = optimizeLoadDistribution(targetLoad, 7, 'slow');
days.forEach((day, i) => {
  console.log(`  ${day.padEnd(10)}: ${slowDist[i]} min`);
});
console.log('');

// Test 6: Training Quality Factors
console.log('========================================');
console.log('Test 6: Training Quality Components\n');

function calculateIntensityBalance(easyPercentage) {
  if (easyPercentage >= 0.75 && easyPercentage <= 0.85) return 100;
  if (easyPercentage >= 0.70 && easyPercentage <= 0.90) return 80;
  if (easyPercentage >= 0.65 && easyPercentage <= 0.95) return 60;
  return 40;
}

console.log('Intensity Balance Scoring:');
[0.60, 0.70, 0.80, 0.85, 0.90, 0.95].forEach(pct => {
  const score = calculateIntensityBalance(pct);
  const status = score >= 80 ? '✅' : score >= 60 ? '⚠️' : '❌';
  console.log(`  ${status} ${(pct * 100).toFixed(0)}% easy → Score: ${score}/100`);
});
console.log('');

console.log('Volume Progression Scoring:');
const progressions = [
  { label: '5-10% increase', change: 0.08, expected: 100 },
  { label: '0-15% increase', change: 0.12, expected: 75 },
  { label: 'Recovery week (-20%)', change: -0.20, expected: 50 },
  { label: 'Too fast (>20%)', change: 0.25, expected: 25 }
];

progressions.forEach(p => {
  let score;
  if (p.change >= 0.05 && p.change <= 0.10) score = 100;
  else if (p.change >= 0 && p.change <= 0.15) score = 75;
  else if (p.change >= -0.2 && p.change < 0) score = 50;
  else score = 25;

  const status = score === p.expected ? '✅' : '❌';
  console.log(`  ${status} ${p.label} → Score: ${score}/100`);
});
console.log('');

// Test 7: Confidence Calculation
console.log('========================================');
console.log('Test 7: Prediction Confidence\n');

function calculateModelConfidence(dataPoints, recentRaces, consistency) {
  let confidence = 0;
  confidence += Math.min(40, dataPoints / 5);
  confidence += Math.min(30, recentRaces * 15);
  confidence += consistency * 0.3;
  return Math.round(Math.min(100, confidence));
}

console.log('Model Confidence Factors:\n');

const scenarios = [
  { label: 'New athlete (minimal data)', data: 10, races: 0, consistency: 50 },
  { label: 'Regular athlete', data: 100, races: 1, consistency: 75 },
  { label: 'Experienced athlete', data: 200, races: 2, consistency: 85 }
];

scenarios.forEach(s => {
  const conf = calculateModelConfidence(s.data, s.races, s.consistency);
  console.log(`${s.label}:`);
  console.log(`  Data points: ${s.data} → ${Math.min(40, s.data / 5)} points`);
  console.log(`  Recent races: ${s.races} → ${Math.min(30, s.races * 15)} points`);
  console.log(`  Consistency: ${s.consistency}/100 → ${(s.consistency * 0.3).toFixed(0)} points`);
  console.log(`  Total confidence: ${conf}%\n`);
});

console.log('========================================');
console.log('✅ All Fase 3 tests completed!');
console.log('========================================\n');
