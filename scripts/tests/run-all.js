#!/usr/bin/env node
/**
 * NihongoPro — Test Runner
 * ===========================
 * Discovers and runs every scripts/tests/test-*.js suite against the
 * REAL production code in assets/platform.js (loaded via vm, not duplicated).
 *
 * Usage:
 *   node scripts/tests/run-all.js
 *
 * Exit codes:
 *   0 = all tests passed
 *   1 = at least one test failed
 */
const fs = require('fs');
const path = require('path');

const testDir = __dirname;
const testFiles = fs.readdirSync(testDir).filter(f => f.startsWith('test-') && f.endsWith('.js'));

if (testFiles.length === 0) {
  console.log('No test files found (expected scripts/tests/test-*.js)');
  process.exit(1);
}

async function run() {
  console.log('🧪 NihongoPro Test Runner\n' + '='.repeat(50));

  let totalPass = 0;
  let totalFail = 0;
  const failures = [];

  for (const file of testFiles.sort()) {
    const { tests } = require(path.join(testDir, file));
    console.log(`\n📄 ${file} (${tests.length} tests)`);

    for (const t of tests) {
      try {
        await t.fn();
        totalPass++;
        console.log(`   ✅ ${t.name}`);
      } catch (e) {
        totalFail++;
        failures.push({ file, name: t.name, message: e.message });
        console.log(`   ❌ ${t.name}`);
        console.log(`      ${e.message}`);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`RESULT: ${totalPass} passed, ${totalFail} failed (${testFiles.length} suites)`);

  if (totalFail > 0) {
    console.log('\nFailed tests:');
    for (const f of failures) {
      console.log(`  [${f.file}] ${f.name}\n    → ${f.message}`);
    }
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
