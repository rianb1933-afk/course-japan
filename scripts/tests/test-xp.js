/**
 * Test suite: XP / Level progression system
 * Runs against the REAL assets/platform.js, not a duplicate.
 *
 * XP_LEVELS thresholds (from platform.js):
 *   [0,100,250,500,900,1500,2500,4000,6000,9000,13000,18000,25000,34000,45000]
 *   index 0 → level 1, index 1 → level 2, ... index 14 → level 15 (max)
 */
const assert = require('assert');
const { loadPlatform } = require('./load-platform');

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

const XP_LEVELS = [0, 100, 250, 500, 900, 1500, 2500, 4000, 6000, 9000, 13000, 18000, 25000, 34000, 45000];

// ── levelFromXP ──────────────────────────────────────────────────

test('levelFromXP(0) is level 1 (starting level)', () => {
  const { NP } = loadPlatform();
  assert.strictEqual(NP.XP.levelFromXP(0), 1);
});

test('levelFromXP() is correct at every exact threshold boundary', () => {
  const { NP } = loadPlatform();
  XP_LEVELS.forEach((threshold, idx) => {
    const expectedLevel = idx + 1;
    assert.strictEqual(
      NP.XP.levelFromXP(threshold), expectedLevel,
      `xp=${threshold} should be level ${expectedLevel}, got ${NP.XP.levelFromXP(threshold)}`
    );
  });
});

test('levelFromXP() one point below a threshold stays at the lower level', () => {
  const { NP } = loadPlatform();
  // 99 XP should still be level 1 (threshold for level 2 is 100)
  assert.strictEqual(NP.XP.levelFromXP(99), 1);
  // 249 XP should still be level 2 (threshold for level 3 is 250)
  assert.strictEqual(NP.XP.levelFromXP(249), 2);
});

test('levelFromXP() caps at level 15 for any XP beyond the max threshold', () => {
  const { NP } = loadPlatform();
  assert.strictEqual(NP.XP.levelFromXP(45000), 15);
  assert.strictEqual(NP.XP.levelFromXP(99999999), 15, 'absurdly high XP should not exceed level 15');
});

test('levelFromXP() handles negative XP gracefully (clamped to level 1)', () => {
  const { NP } = loadPlatform();
  assert.strictEqual(NP.XP.levelFromXP(-50), 1);
});

// ── levelProgress ────────────────────────────────────────────────

test('levelProgress() is 0% exactly at a level threshold', () => {
  const { NP } = loadPlatform();
  assert.strictEqual(NP.XP.levelProgress(100), 0, 'xp=100 is the start of level 2, so progress should be 0%');
});

test('levelProgress() is 100% at the max level (no further progress possible)', () => {
  const { NP } = loadPlatform();
  assert.strictEqual(NP.XP.levelProgress(45000), 100);
  assert.strictEqual(NP.XP.levelProgress(999999), 100);
});

test('levelProgress() is roughly 50% halfway between two thresholds', () => {
  const { NP } = loadPlatform();
  // Level 1→2 range is 0-100. Halfway = 50 XP.
  const progress = NP.XP.levelProgress(50);
  assert.ok(progress >= 45 && progress <= 55, `expected ~50%, got ${progress}%`);
});

test('levelProgress() never returns a value outside 0-100', () => {
  const { NP } = loadPlatform();
  for (const xp of [0, 50, 100, 5000, 45000, 999999, -10]) {
    const p = NP.XP.levelProgress(xp);
    assert.ok(p >= 0 && p <= 100, `levelProgress(${xp}) = ${p} is out of bounds`);
  }
});

// ── nextLevel ────────────────────────────────────────────────────

test('nextLevel() returns the XP threshold needed for the next level', () => {
  const { NP } = loadPlatform();
  assert.strictEqual(NP.XP.nextLevel(0), 100, 'from level 1 (0 XP), next threshold is 100');
  assert.strictEqual(NP.XP.nextLevel(100), 250, 'from level 2 (100 XP), next threshold is 250');
});

test('nextLevel() at max level returns the max threshold (no further level)', () => {
  const { NP } = loadPlatform();
  assert.strictEqual(NP.XP.nextLevel(45000), 45000);
});

// ── levelTitle ───────────────────────────────────────────────────

test('levelTitle() returns a non-empty string for every valid level 1-15', () => {
  const { NP } = loadPlatform();
  for (let lv = 1; lv <= 15; lv++) {
    const title = NP.XP.levelTitle(lv);
    assert.ok(typeof title === 'string' && title.length > 0, `level ${lv} should have a title, got "${title}"`);
  }
});

test('levelTitle() does not crash on out-of-range levels (clamps gracefully)', () => {
  const { NP } = loadPlatform();
  assert.doesNotThrow(() => NP.XP.levelTitle(999));
  assert.doesNotThrow(() => NP.XP.levelTitle(0));
});

// ── State.addXP (integration: XP + level-up + persistence) ────────

test('State.addXP() increases user XP and persists it', () => {
  const { NP } = loadPlatform();
  NP.State.addXP(50, 'test reason');
  assert.strictEqual(NP.State.getUser().xp, 50);
});

test('State.addXP() accumulates across multiple calls', () => {
  const { NP } = loadPlatform();
  NP.State.addXP(30, 'first');
  NP.State.addXP(20, 'second');
  assert.strictEqual(NP.State.getUser().xp, 50);
});

test('State.addXP() updates the user level when crossing a threshold', () => {
  const { NP } = loadPlatform();
  assert.strictEqual(NP.State.getUser().level, 1, 'should start at level 1');
  NP.State.addXP(100, 'level up trigger');
  assert.strictEqual(NP.State.getUser().level, 2, 'crossing 100 XP should advance to level 2');
});

test('State.addXP() does NOT change level when staying under the next threshold', () => {
  const { NP } = loadPlatform();
  NP.State.addXP(50, 'half way');
  assert.strictEqual(NP.State.getUser().level, 1, '50 XP is still under the level-2 threshold of 100');
});

module.exports = { tests };
