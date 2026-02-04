/**
 * Manual test for VDOT calculations
 * Compares against Jack Daniels' Running Formula values
 */

const { PerformanceAnalytics } = require('./performanceAnalytics');

// Mock Firebase for testing
jest.mock('../config/firebase', () => ({
  db: {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ docs: [], empty: true })
  }
}));

const analytics = new PerformanceAnalytics('test-uid');

console.log('========================================');
console.log('VDOT CALCULATION TEST');
console.log('========================================\n');

// Test cases from Jack Daniels' Running Formula
const testCases = [
  {
    name: '20:00 5K',
    distance: 5,
    time: 20 * 60,
    expectedVDOT: 50.4,
    tolerance: 2
  },
  {
    name: '18:00 5K',
    distance: 5,
    time: 18 * 60,
    expectedVDOT: 57.5,
    tolerance: 2
  },
  {
    name: '16:00 5K',
    distance: 5,
    time: 16 * 60,
    expectedVDOT: 66.5,
    tolerance: 2
  },
  {
    name: '40:00 10K',
    distance: 10,
    time: 40 * 60,
    expectedVDOT: 51.0,
    tolerance: 2
  },
  {
    name: '1:30:00 Half Marathon',
    distance: 21.1,
    time: 90 * 60,
    expectedVDOT: 53.0,
    tolerance: 2
  },
  {
    name: '3:00:00 Marathon',
    distance: 42.2,
    time: 3 * 60 * 60,
    expectedVDOT: 51.0,
    tolerance: 2
  },
  {
    name: '2:30:00 Marathon (Elite)',
    distance: 42.2,
    time: 2.5 * 60 * 60,
    expectedVDOT: 68.0,
    tolerance: 3
  }
];

console.log('Testing VDOT calculations:\n');

let passCount = 0;
let failCount = 0;

testCases.forEach(test => {
  const vdot = analytics.calculateVDOT(test.distance, test.time);
  const diff = Math.abs(vdot - test.expectedVDOT);
  const pass = diff <= test.tolerance;

  if (pass) {
    passCount++;
    console.log(`✅ ${test.name}: VDOT ${vdot.toFixed(1)} (expected ~${test.expectedVDOT})`);
  } else {
    failCount++;
    console.log(`❌ ${test.name}: VDOT ${vdot.toFixed(1)} (expected ~${test.expectedVDOT}, diff: ${diff.toFixed(1)})`);
  }
});

console.log(`\n========================================`);
console.log(`Results: ${passCount} passed, ${failCount} failed`);
console.log(`========================================\n`);

// Test VDOT to race time conversion
console.log('Testing race time predictions for VDOT 50:\n');

const vdot50 = 50;
const predictions = {
  '5K': analytics.vdotToRaceTime(vdot50, 5),
  '10K': analytics.vdotToRaceTime(vdot50, 10),
  'Half Marathon': analytics.vdotToRaceTime(vdot50, 21.1),
  'Marathon': analytics.vdotToRaceTime(vdot50, 42.2)
};

console.log('VDOT 50 predictions:');
Object.entries(predictions).forEach(([distance, time]) => {
  console.log(`  ${distance}: ${time}`);
});

console.log('\n========================================');
console.log('TSB STATUS TEST');
console.log('========================================\n');

const tsbTests = [
  { tsb: -25, ratio: 1.6, expectedStatus: 'OVERREACHING' },
  { tsb: -10, ratio: 1.4, expectedStatus: 'HIGH_LOAD' },
  { tsb: 0, ratio: 1.1, expectedStatus: 'OPTIMAL' },
  { tsb: 15, ratio: 0.9, expectedStatus: 'FRESH' },
  { tsb: -30, ratio: 1.2, expectedStatus: 'FATIGUED' }
];

tsbTests.forEach(test => {
  const status = analytics.getTSBStatus(test.tsb, test.ratio);
  const pass = status === test.expectedStatus;
  const icon = pass ? '✅' : '❌';
  console.log(`${icon} TSB=${test.tsb}, Ratio=${test.ratio} → ${status} (expected ${test.expectedStatus})`);
});

console.log('\n========================================');
console.log('All tests completed!');
console.log('========================================\n');

// Exit
process.exit(passCount === testCases.length ? 0 : 1);
