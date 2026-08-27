/**
 * Test suite: SRS (Spaced Repetition) algorithm
 * Runs against the REAL assets/platform.js, not a duplicate.
 */
const assert = require('assert');
const { loadPlatform } = require('./load-platform');

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// ── Tests ────────────────────────────────────────────────────────

test('defaultCard() returns sane initial state', () => {
  const { NP } = loadPlatform();
  const c = NP.SRS.defaultCard('card1');
  assert.strictEqual(c.id, 'card1');
  assert.strictEqual(c.ef, 2.5);
  assert.strictEqual(c.interval, 0);
  assert.strictEqual(c.reps, 0);
  assert.strictEqual(c.lastRating, null);
});

test('rate(Again) resets reps to 0 and gives short interval', () => {
  const { NP } = loadPlatform();
  NP.SRS.rate('c1', 2); // Good first, to build up reps
  NP.SRS.rate('c1', 2);
  const before = NP.SRS.loadCards()['c1'];
  assert.ok(before.reps >= 2, 'reps should have built up before testing reset');

  const after = NP.SRS.rate('c1', 0); // Again
  assert.strictEqual(after.reps, 0, 'Again should reset reps to 0');
  assert.strictEqual(after.interval, 1, 'Again should give a 1-minute interval');
});

test('rate(Good) on a fresh card gives 10min, builds reps', () => {
  const { NP } = loadPlatform();
  const c = NP.SRS.rate('c2', 2);
  assert.strictEqual(c.interval, 10);
  assert.strictEqual(c.reps, 1);
});

test('rate(Easy) on a fresh card gives the longest interval (5760min = 4 days)', () => {
  const { NP } = loadPlatform();
  const c = NP.SRS.rate('c3', 3);
  assert.strictEqual(c.interval, 5760);
});

test('repeated Good ratings produce a growing interval (spacing effect)', () => {
  const { NP } = loadPlatform();
  const intervals = [];
  for (let i = 0; i < 4; i++) {
    const c = NP.SRS.rate('c4', 2);
    intervals.push(c.interval);
  }
  for (let i = 1; i < intervals.length; i++) {
    assert.ok(intervals[i] > intervals[i - 1],
      `interval should grow each time: ${intervals}`);
  }
});

test('ease factor (ef) never drops below 1.3 floor, even with many "Again" ratings', () => {
  const { NP } = loadPlatform();
  let c;
  for (let i = 0; i < 30; i++) {
    c = NP.SRS.rate('c5', 0); // spam Again
  }
  assert.ok(c.ef >= 1.3, `ef floor violated: ${c.ef}`);
  assert.strictEqual(c.ef, 1.3, 'ef should converge exactly to the floor');
});

test('ease factor (ef) never exceeds 3.0 ceiling, even with many "Easy" ratings', () => {
  const { NP } = loadPlatform();
  let c;
  for (let i = 0; i < 30; i++) {
    c = NP.SRS.rate('c6', 3); // spam Easy
  }
  assert.ok(c.ef <= 3.0, `ef ceiling violated: ${c.ef}`);
});

test('invalid rating values are rejected, not silently treated as "Easy"', () => {
  const { NP } = loadPlatform();
  NP.SRS.rate('c7', 2); // Good
  const before = NP.SRS.loadCards()['c7'];

  const afterInvalid = NP.SRS.rate('c7', 99); // invalid — should be a no-op
  assert.deepStrictEqual(afterInvalid.interval, before.interval,
    'invalid rating must not change the card state');
  assert.deepStrictEqual(afterInvalid.reps, before.reps,
    'invalid rating must not advance reps');
});

test('invalid rating types (NaN, string, undefined) are also rejected', () => {
  const { NP } = loadPlatform();
  NP.SRS.rate('c8', 2);
  const before = NP.SRS.loadCards()['c8'];

  for (const badValue of [NaN, 'banana', undefined, -1, 1.5, null]) {
    const after = NP.SRS.rate('c8', badValue);
    assert.deepStrictEqual(after.interval, before.interval,
      `rating=${badValue} must not change card state`);
  }
});

test('isDue() returns true for a never-studied card', () => {
  const { NP } = loadPlatform();
  assert.strictEqual(NP.SRS.isDue('never-seen-card'), true);
});

test('isDue() returns false immediately after rating "Easy" (long interval, not due yet)', () => {
  const { NP } = loadPlatform();
  NP.SRS.rate('c9', 3); // Easy → 4 day interval
  assert.strictEqual(NP.SRS.isDue('c9'), false);
});

test('getStats() correctly counts due/new/learned across a set of cards', () => {
  const { NP } = loadPlatform();
  NP.SRS.rate('s1', 2); // learned
  NP.SRS.rate('s2', 3); // learned
  // s3 never rated — new + due

  const stats = NP.SRS.getStats(['s1', 's2', 's3']);
  assert.strictEqual(stats.new, 1, 's3 should count as new');
  assert.strictEqual(stats.learned, 2, 's1 and s2 should count as learned');
  assert.strictEqual(stats.due, 1, 'only the never-studied card should be due immediately');
});

test('getStats() retention % only counts cards that have been rated at least once', () => {
  const { NP } = loadPlatform();
  NP.SRS.rate('r1', 2); // Good → counts as retained
  NP.SRS.rate('r2', 0); // Again → counts as not retained
  // r3 never rated → excluded from retention calc

  const stats = NP.SRS.getStats(['r1', 'r2', 'r3']);
  assert.strictEqual(stats.retention, 50, `expected 50% retention (1 of 2 rated cards), got ${stats.retention}`);
});

module.exports = { tests };
