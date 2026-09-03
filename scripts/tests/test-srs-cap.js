/**
 * Test suite: Kuota kartu baru SRS per level JLPT (assets/srs-cap.js)
 * ===================================================================
 * Menguji logika murni batas kartu BARU per hari yang dipakai
 * SRS-Flashcard.html via window.NPCap — termasuk migrasi key lama,
 * pemotongan deck per level, dan batas hari (day boundary): kuota
 * hari ini tidak bocor ke hari berikutnya dan sebaliknya.
 *
 * Semua fungsi murni (storage & data hari di-inject), jadi lintas hari
 * diuji dengan key `np-srs-today-*` buatan — tanpa menyentuh Date nyata.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { LocalStorageMock } = require('./mock-dom');

const tests = [];

function loadCap(seed) {
  const filePath = path.join(__dirname, '..', '..', 'assets', 'srs-cap.js');
  const src = fs.readFileSync(filePath, 'utf-8');
  const localStorage = new LocalStorageMock();
  if (seed) {
    for (const k of Object.keys(seed)) localStorage.setItem(k, seed[k]);
  }
  const sandbox = { window: {}, localStorage, console };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  if (!sandbox.window.NPCap) {
    throw new Error('srs-cap.js did not export window.NPCap');
  }
  return { C: sandbox.window.NPCap, localStorage };
}

function test(name, fn) { tests.push({ name, fn }); }

// Objek dari dalam vm berasal dari realm berbeda (prototype beda) sehingga
// deepStrictEqual lintas-realm gagal; normalisasi lewat JSON dulu.
function plain(x) { return JSON.parse(JSON.stringify(x)); }
const EXPECT_DEFAULTS = { n5: 20, n4: 15, n3: 10, n2: 5, n1: 3, lain: 20 };

test('tanpa key apa pun: default per level (N5 > N1)', () => {
  const { C, localStorage } = loadCap();
  assert.deepStrictEqual(plain(C.readCaps(localStorage)), EXPECT_DEFAULTS);
});

test('migrasi: satu nilai lama (np-srs-new-cap) dipakai semua level', () => {
  const { C, localStorage } = loadCap({ 'np-srs-new-cap': '100' });
  assert.deepStrictEqual(plain(C.readCaps(localStorage)), { n5: 100, n4: 100, n3: 100, n2: 100, n1: 100, lain: 100 });
  // nilai lama tidak valid / negatif → default, bukan crash
  const bad1 = loadCap({ 'np-srs-new-cap': 'abc' });
  assert.deepStrictEqual(plain(bad1.C.readCaps(bad1.localStorage)), EXPECT_DEFAULTS);
  const bad2 = loadCap({ 'np-srs-new-cap': '-5' });
  assert.deepStrictEqual(plain(bad2.C.readCaps(bad2.localStorage)), EXPECT_DEFAULTS);
});

test('key baru menang atas nilai lama; simpan & baca ulang', () => {
  const { C, localStorage } = loadCap({ 'np-srs-new-cap': '100' });
  C.saveCaps(localStorage, { n5: 30, n4: 25, n3: 20, n2: 10, n1: 5, lain: 30 });
  const caps = C.readCaps(localStorage);
  assert.strictEqual(caps.n5, 30);
  assert.strictEqual(caps.n1, 5, 'nilai per level harus menang atas legacy 100');
  // JSON rusak → fallback ke default, tidak crash
  const corrupt = loadCap({ 'np-srs-new-caps': '{oops' });
  assert.deepStrictEqual(plain(corrupt.C.readCaps(corrupt.localStorage)), EXPECT_DEFAULTS);
});

test('bucketOf memetakan jlpt N1–N5 (besar/kecil); selainnya "lain"', () => {
  const { C } = loadCap();
  assert.strictEqual(C.bucketOf({ id: 'a', jlpt: 'N5' }), 'n5');
  assert.strictEqual(C.bucketOf({ id: 'b', jlpt: 'n3' }), 'n3');
  assert.strictEqual(C.bucketOf({ id: 'c', jlpt: ' N2 ' }), 'n2');
  assert.strictEqual(C.bucketOf({ id: 'd', jlpt: 'N10' }), 'lain');
  assert.strictEqual(C.bucketOf({ id: 'e', jlpt: '' }), 'lain');
  assert.strictEqual(C.bucketOf({ id: 'f' }), 'lain');
  // kartu Kaigo yang punya level ikut kuota level itu; kustom tanpa level → lain
  assert.strictEqual(C.bucketOf({ id: 'kv1', cat: 'kaigo', jlpt: 'N2' }), 'n2');
  assert.strictEqual(C.bucketOf({ id: 'cust1' }), 'lain');
});

test('left/totalLeft menghitung sisa per level; kuota 0 = tanpa batas', () => {
  const { C } = loadCap();
  const caps = C.readCaps({ getItem: () => null }); // default 20/15/10/5/3/20
  const today = { reviewed: [], new: 2, review: 0, newByLevel: { n5: 3, n1: 2 } };
  assert.strictEqual(C.usedToday(today, 'n5'), 3);
  assert.strictEqual(C.usedToday(today, 'n4'), 0);
  assert.strictEqual(C.left(today, caps, 'n5'), 17);
  assert.strictEqual(C.left(today, caps, 'n1'), 1, '3 - 2 = 1 sisa N1');
  assert.strictEqual(C.left(today, caps, 'n4'), 15);
  assert.strictEqual(C.totalLeft(today, caps), 17 + 15 + 10 + 5 + 1 + 20, 'jumlah sisa seluruh level');
  // kuota 0 = tanpa batas → Infinity, dan totalnya ikut "unlimited"
  const noCap = { n5: 0, n4: 0, n3: 0, n2: 0, n1: 0, lain: 0 };
  assert.strictEqual(C.left(today, noCap, 'n5'), Infinity);
  assert.strictEqual(C.totalLeft(today, noCap), Infinity);
});

test('accountNew menambah new & newByLevel sekali per level', () => {
  const { C } = loadCap();
  const today = { reviewed: [], new: 0, review: 0, newByLevel: {} };
  C.accountNew(today, 'n5');
  C.accountNew(today, 'n5');
  C.accountNew(today, 'n1');
  C.accountNew(today, undefined); // bucket hilang → "lain"
  assert.strictEqual(today.new, 4);
  assert.deepStrictEqual(plain(today.newByLevel), { n5: 2, n1: 1, lain: 1 });
  assert.deepStrictEqual(today.reviewed, [], 'accountNew tidak menyentuh reviewed');
});

test('resetUsage: kuota per level kosong, tapi new/reviewed tetap utuh', () => {
  const { C } = loadCap();
  const today = { reviewed: ['k1', 'k2'], new: 3, review: 5, newByLevel: { n5: 2, lain: 1 } };
  C.resetUsage(today);
  assert.deepStrictEqual(plain(today.newByLevel), {}, 'newByLevel harus dikosongkan');
  assert.strictEqual(today.new, 3, 'penghitung new (kartu diperkenalkan) tidak direset');
  assert.strictEqual(today.review, 5, 'penghitung review tidak direset');
  assert.deepStrictEqual(today.reviewed, ['k1', 'k2'], 'daftar kartu diulas tidak direset');
  // kosongkan objek tanpa newByLevel juga aman
  C.resetUsage({ reviewed: [], new: 0, review: 0 });
});

test('reset di tengah hari: kuota langsung penuh lagi, reviewed tetap nyangkut', () => {
  const { C, localStorage } = loadCap();
  const caps = C.readCaps(localStorage);
  caps.n1 = 1;
  const DAY = 'np-srs-today-Thu Sep 03 2026';
  const cards = [{ id: 'x', jlpt: 'N1' }, { id: 'y', jlpt: 'N1' }];
  // pagi: satu N1 baru diperkenalkan → kuota habis, y tertahan
  let d = C.readToday(localStorage, DAY);
  d.reviewed.push('x');
  C.accountNew(d, 'n1');
  localStorage.setItem(DAY, JSON.stringify(d));
  const stored = { x: { reps: 1 } };
  const before = C.trim(cards, stored, caps, C.readToday(localStorage, DAY)).map((c2) => c2.id);
  assert.deepStrictEqual(before, ['x'], 'sebelum reset: kartu N1 kedua dipotong');
  // reset kuota (alur tombol: baca → resetUsage → tulis)
  const cur = C.readToday(localStorage, DAY);
  C.resetUsage(cur);
  localStorage.setItem(DAY, JSON.stringify(cur));
  const after = C.trim(cards, stored, caps, C.readToday(localStorage, DAY)).map((c2) => c2.id);
  assert.deepStrictEqual(after, ['x', 'y'], 'setelah reset: kuota N1 penuh lagi, kartu kedua masuk');
  const persisted = C.readToday(localStorage, DAY);
  assert.strictEqual(persisted.new, 1, 'new tetap 1 — kartu x memang sudah diulas');
  assert.deepStrictEqual(plain(persisted.reviewed), ['x'], 'reviewed tidak diubah oleh reset');
});

test('trim memotong kartu baru yang levelnya kehabisan kuota', () => {
  const { C } = loadCap();
  const caps = { n5: 1, n4: 15, n3: 10, n2: 5, n1: 0, lain: 20 };
  const cards = [
    { id: 'a', jlpt: 'N5' },
    { id: 'b', jlpt: 'N5' },
    { id: 'c', jlpt: 'N1' },
    { id: 'd', jlpt: 'N5' },   // sudah dipelajari → tak pernah dipotong
    { id: 'e' },               // tanpa level → bucket lain (20) → lolos
  ];
  const stored = { d: { reps: 3 } };
  const today = { reviewed: [], new: 0, review: 0, newByLevel: {} };
  const out = C.trim(cards, stored, caps, today).map((x) => x.id);
  assert.ok(out.includes('a'), 'N5 pertama lolos (kuota 1)');
  assert.ok(!out.includes('b'), 'N5 kedua dipotong (kuota N5 = 1 sudah penuh)');
  assert.ok(out.includes('c'), 'N1 kuota 0 = tanpa batas → lolos');
  assert.ok(out.includes('d'), 'kartu lama tidak pernah dipotong');
  assert.ok(out.includes('e'), 'bucket lain masih punya kuota');
  // pemotongan konsisten bila dipanggil ulang di hari yang sama (tanpa storage write)
  const out2 = C.trim(cards, stored, caps, today).map((x) => x.id);
  assert.deepStrictEqual(out2, out, 'trim murni: hasil sama untuk data hari yang sama');
});

test('day boundary: kuota hari Senin tidak bocor ke Selasa', () => {
  const { C, localStorage } = loadCap();
  const caps = C.readCaps(localStorage);
  caps.n1 = 2; // contoh: N1 hanya 2 kartu baru per hari
  const cards = [
    { id: 'n1a', jlpt: 'N1' }, // sudah diperkenalkan Senin (reps > 0)
    { id: 'n1b', jlpt: 'N1' },
    { id: 'n1c', jlpt: 'N1' },
    { id: 'n5x', jlpt: 'N5' },
  ];
  const stored = { n1a: { reps: 1 } };
  const DAY1 = 'np-srs-today-Mon Sep 01 2026';
  const DAY2 = 'np-srs-today-Tue Sep 02 2026';

  // Simulasikan ulasan kartu baru di hari Senin persis seperti alur halaman:
  // readToday → push reviewed → accountNew → setItem (per kartu)
  let d1 = C.readToday(localStorage, DAY1);
  d1.reviewed.push('n1a');
  C.accountNew(d1, 'n1');
  localStorage.setItem(DAY1, JSON.stringify(d1));
  assert.strictEqual(C.usedToday(C.readToday(localStorage, DAY1), 'n1'), 1);

  // Senin: 1 slot N1 tersisa → n1b boleh, n1c tertahan
  const mon = C.readToday(localStorage, DAY1);
  const monOut = C.trim(cards, stored, caps, mon).map((x) => x.id);
  assert.ok(monOut.includes('n1b'), 'Senin masih ada 1 slot N1');
  assert.ok(!monOut.includes('n1c'), 'Senin kartu N1 ketiga dipotong');
  assert.ok(monOut.includes('n5x'), 'level lain tidak terpengaruh');

  // Selasa (hari baru, key kosong): kuota penuh lagi → n1b DAN n1c masuk
  const tue = C.readToday(localStorage, DAY2);
  assert.strictEqual(C.usedToday(tue, 'n1'), 0, 'hari baru mulai dari nol');
  const tueOut = C.trim(cards, stored, caps, tue).map((x) => x.id);
  assert.ok(tueOut.includes('n1b') && tueOut.includes('n1c'), 'Selasa kuota N1 reset → 2 kartu lolos');

  // trim tidak menulis apa pun ke storage
  assert.strictEqual(localStorage.getItem(DAY1), JSON.stringify(d1), 'trim tidak menulis data harian');
});

test('alur halaman utuh: accountNew lalu trim membaca pemakaian yang sama', () => {
  const { C, localStorage } = loadCap();
  const caps = C.readCaps(localStorage);
  caps.n1 = 1;
  const DAY = 'np-srs-today-Wed Sep 03 2026';
  const cards = [{ id: 'x', jlpt: 'N1' }, { id: 'y', jlpt: 'N1' }];
  // hari ini satu kartu N1 baru sudah diulas (seperti trackReview)
  const d = C.readToday(localStorage, DAY);
  d.reviewed.push('x');
  C.accountNew(d, 'n1');
  localStorage.setItem(DAY, JSON.stringify(d));
  // sisa kuota N1 = 0 → trim menyisakan hanya kartu lama (x ber-reps > 0)
  const stored = { x: { reps: 1 } };
  const out = C.trim(cards, stored, caps, C.readToday(localStorage, DAY)).map((c2) => c2.id);
  assert.deepStrictEqual(out, ['x'], 'kartu N1 baru kedua dipotong karena kuota habis terpakai');
});

test('trim tidak menulis kuota maupun data harian (murni baca)', () => {
  const { C, localStorage } = loadCap({ 'np-srs-new-cap': '20' });
  const caps = C.readCaps(localStorage);
  const cards = [{ id: 'a', jlpt: 'N5' }, { id: 'b', jlpt: 'N5' }];
  const beforeCaps = localStorage.getItem('np-srs-new-caps');
  const today = { reviewed: [], new: 0, review: 0, newByLevel: { n5: 1 } };
  C.trim(cards, {}, caps, today);
  assert.strictEqual(localStorage.getItem('np-srs-new-caps'), beforeCaps, 'np-srs-new-caps tidak berubah');
});

module.exports = { tests };
