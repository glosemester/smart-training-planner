/**
 * Test for Adaptive Periodization and Load Management (Fase 2)
 */

const { AdaptivePeriodization } = require('./adaptivePeriodization');
const { LoadManagement } = require('./loadManagement');

// Mock analytics
class MockAnalytics {
  async getCurrentVDOT() {
    return 50;
  }

  async assessExperienceLevel() {
    return 'intermediate';
  }

  calculateVDOT(distance, time) {
    // Simple mock
    return 50;
  }

  async calculateTSB() {
    return {
      tsb: 0,
      ratio: 1.1,
      status: 'OPTIMAL',
      acuteLoad: 300,
      chronicLoad: 280
    };
  }

  async calculateMonotony() {
    return {
      monotony: 1.3,
      risk: 'LOW'
    };
  }

  async getWorkouts(days) {
    return [];
  }

  groupByWeek(workouts) {
    return [300, 310, 320, 330]; // Sample weekly loads
  }
}

// Mock recovery
class MockRecovery {
  async analyzeRecoveryTrend(days) {
    return {
      trend: 'STABLE',
      confidence: 0.8
    };
  }
}

console.log('========================================');
console.log('FASE 2: PERIODIZATION & LOAD MANAGEMENT');
console.log('========================================\n');

// Test 1: Optimal Phase Calculation
console.log('Test 1: Optimal Phase Calculation\n');

const userData = {
  uid: 'test-uid',
  targetTime: 3 * 60 * 60 // 3 hour marathon
};

const analytics = new MockAnalytics();
const periodization = new AdaptivePeriodization(userData, analytics);

async function testPhaseCalculation() {
  console.log('Marathon (42.2km), 16 weeks:');
  const marathonPhases = await periodization.calculateOptimalPhases(16, 42.2);
  console.log(`  Base: ${marathonPhases.base} weeks`);
  console.log(`  Build: ${marathonPhases.build} weeks`);
  console.log(`  Peak: ${marathonPhases.peak} weeks`);
  console.log(`  Taper: ${marathonPhases.taper} weeks`);
  console.log(`  Total: ${marathonPhases.base + marathonPhases.build + marathonPhases.peak + marathonPhases.taper} weeks`);
  console.log(`  Reasoning: ${marathonPhases.reasoning.join(', ')}\n`);

  console.log('Ultra (80km), 20 weeks:');
  const ultraPhases = await periodization.calculateOptimalPhases(20, 80);
  console.log(`  Base: ${ultraPhases.base} weeks`);
  console.log(`  Build: ${ultraPhases.build} weeks`);
  console.log(`  Peak: ${ultraPhases.peak} weeks`);
  console.log(`  Taper: ${ultraPhases.taper} weeks`);
  console.log(`  Total: ${ultraPhases.base + ultraPhases.build + ultraPhases.peak + ultraPhases.taper} weeks\n`);

  console.log('5K (5km), 8 weeks:');
  const fiveKPhases = await periodization.calculateOptimalPhases(8, 5);
  console.log(`  Base: ${fiveKPhases.base} weeks`);
  console.log(`  Build: ${fiveKPhases.build} weeks`);
  console.log(`  Peak: ${fiveKPhases.peak} weeks`);
  console.log(`  Taper: ${fiveKPhases.taper} weeks\n`);
}

// Test 2: Micro-cycle Generation
console.log('========================================');
console.log('Test 2: Micro-cycle Generation\n');

function testMicroCycles() {
  console.log('Standard 3:1 pattern (12 weeks):');
  const standard = periodization.generateMicroCycles('build', 12, 'average');
  const loadTypes = standard.map(w => w.loadType === 'RECOVERY' ? 'R' : 'B').join('-');
  console.log(`  Pattern: ${loadTypes}`);
  console.log(`  Recovery weeks: ${standard.filter(w => w.loadType === 'RECOVERY').map(w => w.weekNumber).join(', ')}\n`);

  console.log('Slow recoverer 2:1 pattern (12 weeks):');
  const slow = periodization.generateMicroCycles('build', 12, 'slow');
  const slowPattern = slow.map(w => w.loadType === 'RECOVERY' ? 'R' : 'B').join('-');
  console.log(`  Pattern: ${slowPattern}`);
  console.log(`  Recovery weeks: ${slow.filter(w => w.loadType === 'RECOVERY').map(w => w.weekNumber).join(', ')}\n`);

  console.log('Fast recoverer 4:1 pattern in base (12 weeks):');
  const fast = periodization.generateMicroCycles('base', 12, 'fast');
  const fastPattern = fast.map(w => w.loadType === 'RECOVERY' ? 'R' : 'B').join('-');
  console.log(`  Pattern: ${fastPattern}`);
  console.log(`  Recovery weeks: ${fast.filter(w => w.loadType === 'RECOVERY').map(w => w.weekNumber).join(', ')}\n`);
}

// Test 3: Load Management
console.log('========================================');
console.log('Test 3: Load Management\n');

const recovery = new MockRecovery();
const loadManager = new LoadManagement(analytics, recovery);

function testLoadProgression() {
  console.log('Current load: 400 minutes\n');

  console.log('Build phase, stable recovery:');
  const buildStable = loadManager.calculateNextWeekLoad(400, 'build', 'stable');
  console.log(`  Target: ${buildStable.targetLoad} min (${buildStable.minLoad}-${buildStable.maxLoad})`);
  console.log(`  Reasoning: ${buildStable.reasoning}\n`);

  console.log('Build phase, declining recovery:');
  const buildDeclining = loadManager.calculateNextWeekLoad(400, 'build', 'declining');
  console.log(`  Target: ${buildDeclining.targetLoad} min (${buildDeclining.minLoad}-${buildDeclining.maxLoad})`);
  console.log(`  Reasoning: ${buildDeclining.reasoning}\n`);

  console.log('Build phase, improving recovery:');
  const buildImproving = loadManager.calculateNextWeekLoad(400, 'build', 'improving');
  console.log(`  Target: ${buildImproving.targetLoad} min (${buildImproving.minLoad}-${buildImproving.maxLoad})`);
  console.log(`  Reasoning: ${buildImproving.reasoning}\n`);

  console.log('Taper phase:');
  const taper = loadManager.calculateNextWeekLoad(400, 'taper', 'stable');
  console.log(`  Target: ${taper.targetLoad} min (${taper.minLoad}-${taper.maxLoad})`);
  console.log(`  Reasoning: ${taper.reasoning}\n`);
}

// Test 4: Injury Risk Classification
console.log('========================================');
console.log('Test 4: Injury Risk Classification\n');

function testRiskClassification() {
  console.log('Risk scores:');
  [20, 40, 70, 90].forEach(score => {
    const level = loadManager.classifyRiskLevel(score);
    console.log(`  Score ${score} → ${level}`);
  });
  console.log('');
}

// Test 5: Long Run Progression
console.log('========================================');
console.log('Test 5: Long Run Progression\n');

function testLongRunProgression() {
  console.log('Marathon (42.2km) long run progression:');

  let currentDistance = 15;
  ['base', 'build', 'peak', 'taper'].forEach(phase => {
    const progression = loadManager.calculateLongRunProgression(currentDistance, phase, 42.2);
    console.log(`  ${phase.padEnd(6)}: ${currentDistance}km → ${progression.recommendedDistance}km`);
    currentDistance = progression.recommendedDistance;
  });
  console.log('');

  console.log('Ultra (80km) long run progression:');
  currentDistance = 20;
  ['base', 'build', 'peak'].forEach(phase => {
    const progression = loadManager.calculateLongRunProgression(currentDistance, phase, 80);
    console.log(`  ${phase.padEnd(6)}: ${currentDistance}km → ${progression.recommendedDistance}km (max: ${progression.maxDistance}km)`);
    currentDistance = progression.recommendedDistance;
  });
  console.log('');
}

// Test 6: Phase Characteristics
console.log('========================================');
console.log('Test 6: Phase Characteristics\n');

function testPhaseCharacteristics() {
  ['base', 'build', 'peak', 'taper'].forEach(phase => {
    const char = periodization.getPhaseCharacteristics(phase);
    console.log(`${phase.toUpperCase()}:`);
    console.log(`  Focus: ${char.focus}`);
    console.log(`  Intensity: Easy ${(char.intensityDistribution.easy * 100).toFixed(0)}%, Moderate ${(char.intensityDistribution.moderate * 100).toFixed(0)}%, Hard ${(char.intensityDistribution.hard * 100).toFixed(0)}%`);
    console.log(`  Weekly intensity sessions: ${char.weeklyIntensitySessions}`);
    console.log('');
  });
}

// Run all tests
async function runAllTests() {
  await testPhaseCalculation();
  testMicroCycles();
  testLoadProgression();
  testRiskClassification();
  testLongRunProgression();
  testPhaseCharacteristics();

  console.log('========================================');
  console.log('✅ All Fase 2 tests completed!');
  console.log('========================================\n');
}

runAllTests().catch(console.error);
