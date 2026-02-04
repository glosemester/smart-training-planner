/**
 * Standalone VDOT calculation test
 * Tests the math without Firebase dependencies
 */

// Copy the VDOT calculation function directly
function calculateVDOT(distanceKm, timeSeconds) {
  const velocity = (distanceKm * 1000) / (timeSeconds / 60); // m/min

  // Daniels' VDOT formula
  const vo2 = -4.60 + 0.182258 * velocity + 0.000104 * Math.pow(velocity, 2);
  const percentVO2max = 0.8 + 0.1894393 * Math.exp(-0.012778 * (timeSeconds / 60)) +
                        0.2989558 * Math.exp(-0.1932605 * (timeSeconds / 60));

  return vo2 / percentVO2max;
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function vdotToRaceTime(vdot, distanceKm) {
  let timeSeconds = distanceKm * 300; // Initial guess: 5 min/km pace
  let iterations = 0;
  const maxIterations = 100;

  while (iterations < maxIterations) {
    const calculatedVDOT = calculateVDOT(distanceKm, timeSeconds);
    const error = calculatedVDOT - vdot;

    if (Math.abs(error) < 0.1) break;

    timeSeconds -= error * 10;
    iterations++;
  }

  return formatTime(timeSeconds);
}

console.log('========================================');
console.log('VDOT CALCULATION TEST');
console.log('Testing against Jack Daniels\' Running Formula');
console.log('========================================\n');

// Test cases from Jack Daniels' Running Formula
const testCases = [
  { name: '20:00 5K', distance: 5, time: 20 * 60, expectedVDOT: 50.4 },
  { name: '18:00 5K', distance: 5, time: 18 * 60, expectedVDOT: 57.5 },
  { name: '16:00 5K (Elite)', distance: 5, time: 16 * 60, expectedVDOT: 66.5 },
  { name: '40:00 10K', distance: 10, time: 40 * 60, expectedVDOT: 51.0 },
  { name: '35:00 10K', distance: 10, time: 35 * 60, expectedVDOT: 60.0 },
  { name: '1:30:00 Half Marathon', distance: 21.1, time: 90 * 60, expectedVDOT: 53.0 },
  { name: '1:15:00 Half Marathon', distance: 21.1, time: 75 * 60, expectedVDOT: 65.0 },
  { name: '3:00:00 Marathon', distance: 42.2, time: 3 * 60 * 60, expectedVDOT: 51.0 },
  { name: '2:30:00 Marathon (Elite)', distance: 42.2, time: 2.5 * 60 * 60, expectedVDOT: 68.0 }
];

let passCount = 0;
let failCount = 0;

testCases.forEach(test => {
  const vdot = calculateVDOT(test.distance, test.time);
  const diff = Math.abs(vdot - test.expectedVDOT);
  const tolerance = 2.5; // Allow 2.5 VDOT points difference
  const pass = diff <= tolerance;

  if (pass) {
    passCount++;
    console.log(`✅ ${test.name.padEnd(25)} → VDOT ${vdot.toFixed(1)} (expected ~${test.expectedVDOT}, diff: ${diff.toFixed(1)})`);
  } else {
    failCount++;
    console.log(`❌ ${test.name.padEnd(25)} → VDOT ${vdot.toFixed(1)} (expected ~${test.expectedVDOT}, diff: ${diff.toFixed(1)})`);
  }
});

console.log(`\n${'='.repeat(80)}`);
console.log(`VDOT Test Results: ${passCount}/${testCases.length} passed`);
if (failCount === 0) {
  console.log('✅ All VDOT calculations are accurate!');
} else {
  console.log(`⚠️  ${failCount} tests failed - review formula`);
}
console.log(`${'='.repeat(80)}\n`);

// Test race time predictions
console.log('========================================');
console.log('RACE TIME PREDICTIONS FOR VDOT 50');
console.log('========================================\n');

const vdot50 = 50;
const predictions = {
  '5K': vdotToRaceTime(vdot50, 5),
  '10K': vdotToRaceTime(vdot50, 10),
  'Half Marathon': vdotToRaceTime(vdot50, 21.1),
  'Marathon': vdotToRaceTime(vdot50, 42.2)
};

console.log('VDOT 50 should predict approximately:');
console.log('  5K:            ~20:00 → Calculated:', predictions['5K']);
console.log('  10K:           ~41:30 → Calculated:', predictions['10K']);
console.log('  Half Marathon: ~1:31:00 → Calculated:', predictions['Half Marathon']);
console.log('  Marathon:      ~3:10:00 → Calculated:', predictions['Marathon']);

console.log('\n========================================');
console.log('TSB STATUS CLASSIFICATION TEST');
console.log('========================================\n');

function getTSBStatus(tsb, ratio) {
  if (ratio > 1.5) return 'OVERREACHING';
  if (ratio > 1.3) return 'HIGH_LOAD';
  if (ratio < 0.8) return 'DETRAINING';
  if (tsb > 10) return 'FRESH';
  if (tsb < -20) return 'FATIGUED';
  return 'OPTIMAL';
}

const tsbTests = [
  { tsb: -25, ratio: 1.6, expectedStatus: 'OVERREACHING' },
  { tsb: -10, ratio: 1.4, expectedStatus: 'HIGH_LOAD' },
  { tsb: 0, ratio: 1.1, expectedStatus: 'OPTIMAL' },
  { tsb: 15, ratio: 0.9, expectedStatus: 'FRESH' },
  { tsb: -30, ratio: 1.2, expectedStatus: 'FATIGUED' },
  { tsb: 5, ratio: 0.7, expectedStatus: 'DETRAINING' }
];

let tsbPass = 0;
let tsbFail = 0;

tsbTests.forEach(test => {
  const status = getTSBStatus(test.tsb, test.ratio);
  const pass = status === test.expectedStatus;
  const icon = pass ? '✅' : '❌';

  if (pass) tsbPass++;
  else tsbFail++;

  console.log(`${icon} TSB=${test.tsb.toString().padStart(4)}, Ratio=${test.ratio.toFixed(1)} → ${status.padEnd(15)} (expected ${test.expectedStatus})`);
});

console.log(`\n${'='.repeat(80)}`);
console.log(`TSB Test Results: ${tsbPass}/${tsbTests.length} passed`);
console.log(`${'='.repeat(80)}\n`);

// Final summary
console.log('========================================');
console.log('FINAL SUMMARY');
console.log('========================================');
console.log(`VDOT Calculations:    ${passCount}/${testCases.length} passed`);
console.log(`TSB Classification:   ${tsbPass}/${tsbTests.length} passed`);
console.log(`Overall Status:       ${passCount + tsbPass === testCases.length + tsbTests.length ? '✅ ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED'}`);
console.log('========================================\n');

process.exit(passCount + tsbPass === testCases.length + tsbTests.length ? 0 : 1);
