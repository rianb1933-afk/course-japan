/**
 * Test suite: FSRS-5 scheduler (assets/srs-fsrs.js)
 * ==================================================
 * Uji murni pada modul scheduler — tidak menyentuh localStorage milik
 * platform (np-srs-v2) supaya tidak bentrok dengan test-srs.js.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { LocalStorageMock } = require('./mock-dom');

const tests = [];

function loadFSRS(overrides) {
  const filePath = path.join(__dirname, '..', '..', 'assets', 'srs-fsrs.js');
  const src = fs.readFileSync(filePath, 'utf-8');
  const localStorage = new LocalStorageMock();
  const sandbox = {
    window: {},
    localStorage,
    console,
    Date,
    Math,
    JSON,
    process,
  };
  if (overrides && overrides.localStorage) {
    Object.assign(localStorage, overrides.localStorage);
  }
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  if (!sandbox.window.NPFSRS) {
    throw new Error('srs-fsrs.js did not export window.NPFSRS');
  }
  return { F: sandbox.window.NPFSRS, localStorage };
}

function test(name, fn) { tests.push({ name, fn }); }
const DAY = 86400000;

test('modul mengekspor 19 bobot default FSRS-5', () => {
  const { F } = loadFSRS();
  assert.strictEqual(F.weights.length, 19);
  assert.ok(Math.abs(F.weights[0] - 0.40255) < 1e-9, 'w0 harus 0.40255');
  assert.ok(Math.abs(F.weights[18] - 0.6621) < 1e-9, 'w18 harus 0.6621');
});

test('retention(10, 10) = 0.9 dan retention(10, 0) = 1', () => {
  const { F } = loadFSRS();
  assert.ok(Math.abs(F.retention(10, 10) - 0.9) < 1e-9, 'R(S,S) harus 0.9');
  assert.strictEqual(F.retention(10, 0), 1, 'R(S,0) harus 1');
  // Menurun terhadap waktu
  assert.ok(F.retention(10, 30) < F.retention(10, 5), 'R harus menurun');
});

test('nextIntervalDays(S=10, r=0.9) ≈ 10 hari', () => {
  const { F } = loadFSRS();
  const ivl = F.nextIntervalDays(10, 0.9);
  assert.ok(Math.abs(ivl - 10) < 0.01, 'interval harus ≈ S saat r=0.9, got ' + ivl);
});

test('kartu baru: Good → langkah 10 menit, lalu lulus ke tahap ulasan', () => {
  const { F } = loadFSRS();
  const t0 = Date.parse('2026-01-01T00:00:00Z');
  const c = { id: 'n1' };
  F.rate(c, 2, t0);
  assert.strictEqual(c.reps, 1);
  assert.ok(Math.abs((c.nextReview - t0) / 60000 - 10) < 1, 'Good pertama = 10 mnt');
  assert.strictEqual(c.fsrs.graduated, false);
  // Good kedua → lulus
  F.rate(c, 2, t0 + 20 * 60000);
  assert.strictEqual(c.reps, 2);
  assert.strictEqual(c.fsrs.graduated, true);
});

test('interval FSRS tumbuh setelah beberapa Good terjadwal', () => {
  const { F } = loadFSRS();
  const t0 = Date.now();
  const c = { id: 'n2' };
  F.rate(c, 2, t0);                 // 10 mnt
  F.rate(c, 2, t0 + 10 * 60000);    // lulus
  const s0 = c.fsrs.stability;
  const d1 = c.nextReview;
  F.rate(c, 2, d1);                 // ulasan pertama (tepat waktu)
  const s1 = c.fsrs.stability;
  assert.ok(s1 > s0, 'S harus tumbuh: ' + s0 + ' -> ' + s1);
  assert.ok(c.nextReview > d1 + DAY, 'interval pertama harus >= 1 hari');
  // Ulasan kedua (tepat waktu lagi) — tumbuh lagi
  const d2 = c.nextReview;
  F.rate(c, 2, d2);
  assert.ok(c.fsrs.stability > s1, 'S harus terus tumbuh');
  assert.ok(c.nextReview > d2 + DAY);
});

test('lupa (Again) menaikkan lapses dan menurunkan stabilitas', () => {
  const { F } = loadFSRS();
  const t0 = Date.now();
  const c = { id: 'n3' };
  F.rate(c, 2, t0);
  F.rate(c, 2, t0 + 10 * 60000);
  const d = c.nextReview;
  F.rate(c, 2, d); // matang
  const before = c.fsrs.stability;
  const d2 = c.nextReview;
  F.rate(c, 0, d2); // lupa
  assert.ok(c.fsrs.stability < before, 'S pasca-lupa harus lebih kecil');
  assert.strictEqual(c.lapses, 1);
  assert.strictEqual(c.reps, 0, 'reps direset setelah lupa');
  assert.ok(c.nextReview - d2 < 3600000, 'langkah pertama pasca-lupa = 1 menit');
});

test('kartu lama SM-2 dimigrasi tanpa menggeser jadwal (due dipertahankan)', () => {
  const { F } = loadFSRS();
  const t0 = Date.now();
  const legacy = {
    id: 'm1', ef: 2.5, interval: 10080 /* 7 hari */, reps: 3,
    nextReview: t0 + 7 * DAY, lastRating: 2, lastReviewed: t0 - DAY
  };
  F.ensureState(legacy);
  assert.ok(legacy.fsrs.stability > 1, 'stabilitas diestimasi dari interval');
  assert.strictEqual(legacy.fsrs.due, legacy.nextReview, 'due tidak digeser');
  assert.strictEqual(legacy.fsrs.graduated, true, 'kartu berpengalaman dianggap lulus');
});

test('kartu lama SM-2 yang sudah lewat jatuh tempo langsung antre', () => {
  const { F } = loadFSRS();
  const legacy = { id: 'm2', ef: 2.5, interval: 1440, reps: 1, nextReview: Date.now() - DAY };
  F.ensureState(legacy);
  assert.ok(legacy.fsrs.due <= Date.now(), 'due harus <= sekarang');
});

test('currentRetention: 1 sebelum jatuh tempo, turun setelahnya', () => {
  const { F } = loadFSRS();
  const t0 = Date.now();
  const c = { id: 'n4' };
  F.rate(c, 2, t0);
  F.rate(c, 2, t0 + 10 * 60000);
  const d = c.nextReview; // ~3 hari lagi
  assert.strictEqual(F.currentRetention(c, t0 + 60000), 1, 'belum lewat due → R = 1');
  assert.ok(F.currentRetention(c, d + 10 * DAY) < 0.9, 'lewat due → R turun');
});

module.exports = { tests };
