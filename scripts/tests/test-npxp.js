/**
 * Test suite: NPXP (sistem XP terpusat) + NPMateriProgress (auto-hook kuis materi)
 *
 * Melindungi rantai gamifikasi inti:
 *   Aktivitas belajar → NPXP → np-dash-v3 → Dashboard / Analytics / Misi
 *
 * Menjalankan KODE PRODUKSI asli (assets/np-xp.js, assets/np-materi-progress.js)
 * di dalam vm dengan localStorage & DOM di-stub, bukan duplikat logika.
 *
 * Regresi yang dicegah suite ini:
 *   - XP dari suatu fitur berhenti mengalir ke dashboard (silo data)
 *   - Misi harian tidak ter-reset saat ganti hari (misi selalu "selesai")
 *   - Auto-hook berhenti mengenali pola kuis materi (kuis tak tercatat)
 *   - Rekap per-sumber rusak (chart "Sumber XP" di Analytics jadi kosong)
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { LocalStorageMock } = require('./mock-dom');

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

const ASSETS = path.join(__dirname, '..', '..', 'assets');

/**
 * Muat np-xp.js (dan opsional np-materi-progress.js) di sandbox bersih.
 * Setiap test dapat localStorage baru sehingga tidak saling bocor.
 */
function loadXP(opts = {}) {
  const localStorage = new LocalStorageMock();
  const listeners = {};

  const sandbox = {
    localStorage,
    console,
    setTimeout: (fn) => fn(),   // jalankan langsung, tak perlu menunggu
    Date,
    Math,
    JSON,
    Array,
    Object,
    String,
    Number,
    location: { pathname: opts.pathname || '/Materi/Grammar-Teiru.html' },
    document: {
      readyState: 'complete',
      addEventListener: (evt, fn) => { listeners[evt] = fn; },
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
    },
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;

  const ctx = vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ASSETS, 'np-xp.js'), 'utf8'), ctx, { filename: 'np-xp.js' });

  if (opts.withMateriHook) {
    vm.runInContext(
      fs.readFileSync(path.join(ASSETS, 'np-materi-progress.js'), 'utf8'),
      ctx,
      { filename: 'np-materi-progress.js' }
    );
  }

  return { NPXP: sandbox.NPXP, NPMateriProgress: sandbox.NPMateriProgress, sandbox, localStorage };
}

function readDash(localStorage) {
  return JSON.parse(localStorage.getItem('np-dash-v3') || '{}');
}

// ── NPXP: perhitungan XP ────────────────────────────────────────────

test('recordQuiz() memberi 10 XP per jawaban benar', () => {
  const { NPXP } = loadXP();
  NPXP.recordQuiz('grammar', 7, 10);
  assert.strictEqual(NPXP.summary().xp, 70, '7 benar × 10 XP = 70');
});

test('recordQuiz() memberi bonus 20 XP untuk skor sempurna', () => {
  const { NPXP } = loadXP();
  NPXP.recordQuiz('grammar', 10, 10);
  assert.strictEqual(NPXP.summary().xp, 120, '10×10 + bonus 20 = 120');
});

test('recordQuiz() mencatat jumlah soal, bukan hanya yang benar', () => {
  const { NPXP } = loadXP();
  NPXP.recordQuiz('jlpt', 24, 30);
  assert.strictEqual(NPXP.summary().quiz, 30, 'semua 30 soal dihitung sebagai dikerjakan');
});

test('recordVocab() memberi 2 XP per kata', () => {
  const { NPXP } = loadXP();
  NPXP.recordVocab('kosakata', 15);
  assert.strictEqual(NPXP.summary().xp, 30);
  assert.strictEqual(NPXP.summary().vocab, 15);
});

test('award() menolak nilai XP nol atau negatif', () => {
  const { NPXP } = loadXP();
  NPXP.award('game', 0);
  NPXP.award('game', -50);
  assert.strictEqual(NPXP.summary().xp, 0, 'XP tidak boleh berkurang atau bertambah dari nilai tak valid');
});

// ── NPXP: semua fitur mengalir ke SATU dashboard ────────────────────

test('XP dari banyak fitur berbeda terakumulasi di dashboard yang sama', () => {
  const { NPXP } = loadXP();
  NPXP.recordQuiz('jlpt', 24, 30);      // 240
  NPXP.recordQuiz('grammar', 40, 55);   // 400
  NPXP.recordVocab('srs', 15);          // 30
  NPXP.award('speaking', 14);           // 14
  assert.strictEqual(NPXP.summary().xp, 684, 'inilah inti sistem XP terpusat');
});

test('sources() memisahkan XP per sumber (dipakai chart Analytics)', () => {
  const { NPXP } = loadXP();
  NPXP.recordQuiz('jlpt', 10, 10);   // 120
  NPXP.recordVocab('kanji', 5);      // 10
  const src = NPXP.sources();
  assert.strictEqual(src.jlpt, 120);
  assert.strictEqual(src.kanji, 10);
  assert.strictEqual(Object.keys(src).length, 2, 'hanya sumber yang dipakai yang muncul');
});

// ── NPXP: streak & misi harian ──────────────────────────────────────

test('bumpStreak() memulai streak di hari pertama aktivitas', () => {
  const { NPXP } = loadXP();
  NPXP.award('game', 5);
  assert.strictEqual(NPXP.summary().streak, 1);
});

test('misi harian terisi dari aktivitas belajar', () => {
  const { NPXP, localStorage } = loadXP();
  NPXP.recordQuiz('grammar', 3, 3);
  NPXP.recordVocab('srs', 5);
  const missions = readDash(localStorage).missions;
  assert.strictEqual(missions.quiz, 3, 'misi kuis harus terisi');
  assert.strictEqual(missions.vocab, 5, 'misi vocab harus terisi');
});

test('misi harian ter-RESET saat hari berganti (bukan menumpuk selamanya)', () => {
  const { NPXP, localStorage } = loadXP();
  NPXP.recordQuiz('grammar', 3, 3);
  NPXP.recordVocab('srs', 5);

  // Paksa dashboard menganggap misi terakhir dicatat di hari lain
  const dash = readDash(localStorage);
  dash.missionDate = '2020-01-01';
  localStorage.setItem('np-dash-v3', JSON.stringify(dash));

  NPXP.recordQuiz('kanji', 1, 1);   // aktivitas pertama di "hari baru"

  const missions = readDash(localStorage).missions;
  assert.strictEqual(missions.quiz, 1, 'misi kuis mulai dari nol lagi, bukan 3+1');
  assert.strictEqual(missions.vocab, 0, 'misi vocab ikut ter-reset');
});

test('XP total TIDAK ikut ter-reset saat misi harian reset', () => {
  const { NPXP, localStorage } = loadXP();
  NPXP.recordQuiz('grammar', 10, 10);       // 120 XP
  const xpBefore = NPXP.summary().xp;

  const dash = readDash(localStorage);
  dash.missionDate = '2020-01-01';
  localStorage.setItem('np-dash-v3', JSON.stringify(dash));

  NPXP.award('game', 5);
  assert.strictEqual(NPXP.summary().xp, xpBefore + 5, 'XP kumulatif harus tetap bertambah, bukan hilang');
});

// ── NPXP: ketahanan data ────────────────────────────────────────────

test('loadDash() tidak crash saat data localStorage korup', () => {
  const { NPXP, localStorage } = loadXP();
  localStorage.setItem('np-dash-v3', '{ini bukan json}');
  assert.doesNotThrow(() => NPXP.award('game', 10));
  assert.strictEqual(NPXP.summary().xp, 10, 'harus mulai ulang dari dashboard kosong, bukan error');
});

// ── NPMateriProgress: auto-hook kuis materi ─────────────────────────

test('autoHook() mencatat kuis materi ke dashboard saat soal terakhir dijawab', () => {
  const { NPXP, NPMateriProgress, sandbox } = loadXP({ withMateriHook: true });

  // Replikasi pola kuis materi: array Q, counter ok/tot, fungsi ans()
  sandbox.Q = new Array(10).fill({ q: '?', opts: ['a', 'b', 'c', 'd'], a: 0 });
  sandbox.ok = 0;
  sandbox.tot = 0;
  sandbox.ans = function (i) {
    sandbox.tot++;
    if (i === 0) sandbox.ok++;
  };

  NPMateriProgress.autoHook();

  // Kerjakan 10 soal, 7 benar
  [0, 0, 0, 1, 0, 0, 1, 0, 0, 1].forEach((pilihan) => sandbox.ans(pilihan));

  assert.strictEqual(NPXP.summary().quiz, 10, '10 soal harus tercatat di dashboard');
  assert.strictEqual(NPXP.summary().xp, 70, '7 benar × 10 XP');
});

test('autoHook() memetakan materi ke sumber XP yang benar dari nama file', () => {
  const { NPXP, NPMateriProgress, sandbox } = loadXP({
    withMateriHook: true,
    pathname: '/Materi/Kosakata-N3.html',
  });

  sandbox.Q = new Array(5).fill({ q: '?' });
  sandbox.ok = 0;
  sandbox.tot = 0;
  sandbox.ans = function (correct) { sandbox.tot++; if (correct) sandbox.ok++; };

  NPMateriProgress.autoHook();
  [1, 1, 1, 1, 1].forEach((c) => sandbox.ans(c));

  const src = NPXP.sources();
  assert.ok(src.kosakata > 0, 'file Kosakata-*.html harus dicatat sebagai sumber "kosakata"');
});

test('autoHook() TIDAK mencatat kuis yang belum selesai', () => {
  const { NPXP, NPMateriProgress, sandbox } = loadXP({ withMateriHook: true });

  sandbox.Q = new Array(10).fill({ q: '?' });
  sandbox.ok = 0;
  sandbox.tot = 0;
  sandbox.ans = function (correct) { sandbox.tot++; if (correct) sandbox.ok++; };

  NPMateriProgress.autoHook();
  [1, 1, 1].forEach((c) => sandbox.ans(c));   // baru 3 dari 10 soal

  assert.strictEqual(NPXP.summary().quiz, 0, 'XP hanya diberi setelah seluruh kuis selesai');
});

test('getPageStatus() menandai materi selesai bila skor >= 70%', () => {
  const { NPMateriProgress, sandbox } = loadXP({ withMateriHook: true });

  sandbox.Q = new Array(10).fill({ q: '?' });
  sandbox.ok = 0;
  sandbox.tot = 0;
  sandbox.ans = function (correct) { sandbox.tot++; if (correct) sandbox.ok++; };

  NPMateriProgress.autoHook();
  [1, 1, 1, 1, 1, 1, 1, 0, 0, 0].forEach((c) => sandbox.ans(c));   // 7/10 = 70%

  const status = NPMateriProgress.getPageStatus();
  assert.strictEqual(status.bestScore, 70);
  assert.strictEqual(status.completed, true, '70% adalah ambang kelulusan materi');
});

module.exports = { tests };
