/**
 * Mesin penilaian kuis SSW — assets/ssw-quiz.js (Fase 2 platform SSW).
 * =====================================================================
 * Memuat SUMBER ASLI lewat vm. Yang dijaga di sini adalah aturan yang
 * kalau salah TIDAK memunculkan error apa pun, hanya nilai yang keliru:
 * jawaban benar dihitung salah, soal kosong dihitung benar, atau skor
 * kelulusan bergeser diam-diam.
 *
 * Bentuk payload/answer mengikuti validasi netlify/functions/ssw-cms.js
 * supaya soal yang lolos CMS pasti bisa dinilai di sini.
 */
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = process.env.NP_SSW_QUIZ || path.join(__dirname, '..', '..', 'assets', 'ssw-quiz.js');

function load() {
  const sandbox = { window: {}, console, Math, JSON, Number, String, Boolean, Object, Array };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(SRC, 'utf-8'), sandbox, { filename: 'ssw-quiz.js' });
  if (!sandbox.window.SSWQuiz) throw new Error('ssw-quiz.js tidak mengekspor window.SSWQuiz');
  return sandbox.window.SSWQuiz;
}

const mc = (id, index, points) => ({ id, type: 'mc', points, payload: { question: 'q', choices: ['a', 'b', 'c'] }, answer: { index } });

const tests = [
  // ── Per tipe soal ───────────────────────────────────────────────
  {
    name: 'Pilihan ganda: index cocok = benar, index lain = salah',
    fn: () => {
      const Q = load();
      const q = mc('q1', 2);
      assert.strictEqual(Q.gradeQuestion(q, 2).correct, true);
      assert.strictEqual(Q.gradeQuestion(q, 0).correct, false);
    },
  },
  {
    name: 'Pilihan ganda: tidak dijawab TIDAK dihitung benar walau kunci index 0',
    fn: () => {
      // Jebakan klasik: `given == answer.index` dengan given undefined dan
      // kunci 0 bisa lolos kalau perbandingannya longgar.
      const Q = load();
      const q = mc('q1', 0);
      const res = Q.gradeQuestion(q, undefined);
      assert.strictEqual(res.correct, false);
      assert.strictEqual(res.answered, false);
    },
  },
  {
    name: 'Tipe vocab/kanji/grammar/listening/reading dinilai seperti pilihan ganda',
    fn: () => {
      const Q = load();
      ['vocab', 'kanji', 'grammar', 'listening', 'reading'].forEach(type => {
        const q = { id: 'x', type, payload: { question: 'q', choices: ['a', 'b'] }, answer: { index: 1 } };
        assert.strictEqual(Q.gradeQuestion(q, 1).correct, true, type + ' benar');
        assert.strictEqual(Q.gradeQuestion(q, 0).correct, false, type + ' salah');
      });
    },
  },
  {
    name: 'True/false: hanya boolean yang dinilai, string "true" tidak dianggap menjawab',
    fn: () => {
      const Q = load();
      const q = { id: 'q1', type: 'tf', payload: { question: 'q' }, answer: { bool: true } };
      assert.strictEqual(Q.gradeQuestion(q, true).correct, true);
      assert.strictEqual(Q.gradeQuestion(q, false).correct, false);
      const s = Q.gradeQuestion(q, 'true');
      assert.strictEqual(s.correct, false);
      assert.strictEqual(s.answered, false);
    },
  },
  {
    name: 'Isian: cocok dengan salah satu jawaban diterima, tidak peka spasi/kapital/spasi lebar',
    fn: () => {
      const Q = load();
      const q = { id: 'q1', type: 'fill', payload: { question: 'q' }, answer: { accept: ['介護', 'kaigo'] } };
      assert.strictEqual(Q.gradeQuestion(q, '介護').correct, true);
      assert.strictEqual(Q.gradeQuestion(q, '  KAIGO ').correct, true, 'trim + lowercase');
      assert.strictEqual(Q.gradeQuestion(q, '　介護　').correct, true, 'spasi lebar U+3000');
      assert.strictEqual(Q.gradeQuestion(q, 'kaigou').correct, false);
    },
  },
  {
    name: 'Isian kosong tidak pernah benar, walau kunci memuat string kosong',
    fn: () => {
      const Q = load();
      const q = { id: 'q1', type: 'fill', payload: { question: 'q' }, answer: { accept: [''] } };
      assert.strictEqual(Q.gradeQuestion(q, '').correct, false);
      assert.strictEqual(Q.gradeQuestion(q, '   ').correct, false);
    },
  },
  {
    name: 'Menjodohkan: benar hanya bila SELURUH pasangan cocok',
    fn: () => {
      const Q = load();
      const q = {
        id: 'q1', type: 'match',
        payload: { question: 'q', pairs: [{ left: '入浴', right: 'mandi' }, { left: '食事', right: 'makan' }] },
        answer: { pairs: [{ left: '入浴', right: 'mandi' }, { left: '食事', right: 'makan' }] },
      };
      assert.strictEqual(Q.gradeQuestion(q, { '入浴': 'mandi', '食事': 'makan' }).correct, true);
      assert.strictEqual(Q.gradeQuestion(q, { '入浴': 'mandi', '食事': 'mandi' }).correct, false, 'satu salah = salah');
      assert.strictEqual(Q.gradeQuestion(q, { '入浴': 'mandi' }).correct, false, 'kurang lengkap = salah');
    },
  },

  // ── Skor sesi ───────────────────────────────────────────────────
  {
    name: 'Skor dihitung dari POIN, bukan jumlah soal',
    fn: () => {
      const Q = load();
      const qs = [mc('a', 0, 3), mc('b', 0, 1)];
      // Benar hanya soal berbobot 3 dari total 4 poin → 75%, bukan 50%.
      const r = Q.gradeQuiz(qs, { a: 0, b: 1 }, { passScore: 60 });
      assert.strictEqual(r.score, 75);
      assert.strictEqual(r.earned, 3);
      assert.strictEqual(r.total, 4);
      assert.strictEqual(r.correctCount, 1);
    },
  },
  {
    name: 'passed mengikuti pass_score kuis, bukan angka tetap',
    fn: () => {
      const Q = load();
      const qs = [mc('a', 0), mc('b', 0), mc('c', 0), mc('d', 0)];
      const answers = { a: 0, b: 0, c: 1, d: 1 }; // 50%
      assert.strictEqual(Q.gradeQuiz(qs, answers, { passScore: 50 }).passed, true, 'tepat di ambang = lulus');
      assert.strictEqual(Q.gradeQuiz(qs, answers, { passScore: 60 }).passed, false);
    },
  },
  {
    name: 'Soal yang dilewati dihitung salah tapi tercatat sebagai tidak dijawab',
    fn: () => {
      const Q = load();
      const qs = [mc('a', 0), mc('b', 0)];
      const r = Q.gradeQuiz(qs, { a: 0 }, { passScore: 60 });
      assert.strictEqual(r.score, 50);
      assert.strictEqual(r.answeredCount, 1);
      assert.strictEqual(r.questionCount, 2);
      assert.strictEqual(r.detail[1].given, null, 'yang kosong tercatat null, bukan undefined');
    },
  },
  {
    name: 'Penilaian memakai id soal, jadi urutan tampilan yang teracak tidak menggeser jawaban',
    fn: () => {
      const Q = load();
      const qs = [mc('a', 0), mc('b', 1)];
      const lurus = Q.gradeQuiz(qs, { a: 0, b: 1 }, {});
      const terbalik = Q.gradeQuiz(qs.slice().reverse(), { a: 0, b: 1 }, {});
      assert.strictEqual(lurus.score, 100);
      assert.strictEqual(terbalik.score, 100);
    },
  },
  {
    name: 'Kuis tanpa soal memberi 0, bukan NaN/pembagian nol',
    fn: () => {
      const Q = load();
      const r = Q.gradeQuiz([], {}, { passScore: 60 });
      assert.strictEqual(r.score, 0);
      assert.strictEqual(r.passed, false);
      assert.strictEqual(r.questionCount, 0);
    },
  },

  // ── Penyusunan sesi ─────────────────────────────────────────────
  {
    name: 'randomize=false mempertahankan urutan sort',
    fn: () => {
      const Q = load();
      const quiz = { randomize: false, ssw_questions: [
        { id: 'c', sort: 30 }, { id: 'a', sort: 10 }, { id: 'b', sort: 20 },
      ] };
      assert.deepStrictEqual(Q.buildSession(quiz, {}).map(q => q.id), ['a', 'b', 'c']);
    },
  },
  {
    name: 'randomize=true mengacak, dan dengan seed sama hasilnya identik (deterministik saat test)',
    fn: () => {
      const Q = load();
      const quiz = { randomize: true, ssw_questions: [
        { id: 'a', sort: 1 }, { id: 'b', sort: 2 }, { id: 'c', sort: 3 },
        { id: 'd', sort: 4 }, { id: 'e', sort: 5 },
      ] };
      const satu = Q.buildSession(quiz, { rng: Q.mulberry32(42) }).map(q => q.id);
      const dua = Q.buildSession(quiz, { rng: Q.mulberry32(42) }).map(q => q.id);
      assert.deepStrictEqual(satu, dua, 'seed sama = urutan sama');
      assert.strictEqual(satu.length, 5, 'tidak ada soal hilang saat diacak');
      assert.deepStrictEqual(satu.slice().sort(), ['a', 'b', 'c', 'd', 'e'], 'tidak ada duplikat');
    },
  },
  {
    name: 'question_count memotong jumlah soal per sesi (bank soal mock exam)',
    fn: () => {
      const Q = load();
      const quiz = { randomize: true, question_count: 2, ssw_questions: [
        { id: 'a', sort: 1 }, { id: 'b', sort: 2 }, { id: 'c', sort: 3 }, { id: 'd', sort: 4 },
      ] };
      const sesi = Q.buildSession(quiz, { rng: Q.mulberry32(7) });
      assert.strictEqual(sesi.length, 2);
      assert.strictEqual(new Set(sesi.map(q => q.id)).size, 2, 'tidak boleh soal kembar dalam satu sesi');
    },
  },
  {
    name: 'question_count lebih besar dari jumlah soal tidak memaksa soal kembar',
    fn: () => {
      const Q = load();
      const quiz = { question_count: 10, ssw_questions: [{ id: 'a', sort: 1 }, { id: 'b', sort: 2 }] };
      assert.strictEqual(Q.buildSession(quiz, {}).length, 2);
    },
  },

  // ── Waktu ujian (mock exam) ─────────────────────────────────────
  {
    name: 'Batas waktu dihitung dari deadline absolut, bukan penghitung mundur per detik',
    fn: () => {
      // Kalau sisa waktu ditabung lewat interval, tab yang sempat tidak aktif
      // memberi peserta waktu ekstra. Deadline absolut kebal terhadap itu.
      const Q = load();
      const mulai = 1_700_000_000_000;
      const deadline = Q.examDeadline(mulai, 30);
      assert.strictEqual(deadline, mulai + 30 * 60000);
      assert.strictEqual(Q.remainingSeconds(deadline, mulai), 1800);
      // Browser "tertidur" 25 menit: sisa waktu tetap dihitung dari jam sistem.
      assert.strictEqual(Q.remainingSeconds(deadline, mulai + 25 * 60000), 300);
    },
  },
  {
    name: 'time_limit_min kosong/nol = tanpa batas waktu (bukan langsung habis)',
    fn: () => {
      const Q = load();
      const mulai = 1_700_000_000_000;
      [null, undefined, 0, ''].forEach(v => {
        const d = Q.examDeadline(mulai, v);
        assert.strictEqual(d, null, 'deadline harus null untuk ' + JSON.stringify(v));
        assert.strictEqual(Q.remainingSeconds(d, mulai + 999999), null);
        assert.strictEqual(Q.isExpired(d, mulai + 999999), false, 'tanpa batas tidak pernah kedaluwarsa');
      });
    },
  },
  {
    name: 'Sisa waktu tidak pernah negatif, dan kedaluwarsa tepat saat deadline tercapai',
    fn: () => {
      const Q = load();
      const mulai = 1_700_000_000_000;
      const deadline = Q.examDeadline(mulai, 1);
      assert.strictEqual(Q.isExpired(deadline, deadline - 1), false);
      assert.strictEqual(Q.isExpired(deadline, deadline), true, 'tepat di detik terakhir = habis');
      assert.strictEqual(Q.remainingSeconds(deadline, deadline + 60000), 0, 'tidak boleh negatif');
    },
  },
  {
    name: 'formatClock menampilkan mm:ss, dan h:mm:ss bila lebih dari sejam',
    fn: () => {
      const Q = load();
      assert.strictEqual(Q.formatClock(0), '00:00');
      assert.strictEqual(Q.formatClock(9), '00:09');
      assert.strictEqual(Q.formatClock(605), '10:05');
      assert.strictEqual(Q.formatClock(3600), '1:00:00');
      assert.strictEqual(Q.formatClock(-5), '00:00', 'nilai negatif tidak bocor ke tampilan');
    },
  },

  // ── Label sumber ────────────────────────────────────────────────
  {
    name: 'Kuis buatan sendiri berlabel "Generated Practice", bukan tampak resmi',
    fn: () => {
      const Q = load();
      const l = Q.sourceLabel({ source: 'practice' });
      assert.strictEqual(l.official, false);
      assert.strictEqual(l.text, 'Generated Practice');
    },
  },
  {
    name: 'Kuis resmi membawa nama & tautan sumbernya',
    fn: () => {
      const Q = load();
      const l = Q.sourceLabel({ source: 'official', source_name: 'JITCO', source_url: 'https://example.org/x' });
      assert.strictEqual(l.official, true);
      assert.ok(l.text.includes('JITCO'));
      assert.strictEqual(l.url, 'https://example.org/x');
    },
  },
  {
    name: 'buildSession: distribution menarik jumlah per tag area, dikelompokkan per area',
    fn() {
      const Q = load();
      const soal = (id, tag) => ({ id, sort: Number(id.slice(1)), tags: [tag] });
      const quiz = {
        randomize: true,
        distribution: { 'area:kihon': 2, 'area:seikatsu': 3 },
        ssw_questions: [soal('k1', 'area:kihon'), soal('s1', 'area:seikatsu'), soal('k2', 'area:kihon'),
          soal('k3', 'area:kihon'), soal('s2', 'area:seikatsu'), soal('s3', 'area:seikatsu'),
          soal('s4', 'area:seikatsu'), soal('x1', 'area:lain')],
      };
      const sesi = Q.buildSession(quiz, { rng: Q.mulberry32(3) });
      // Array.from: array hasil dibuat di realm vm — deepStrictEqual menolak prototipenya
      const area = Array.from(sesi, q => q.tags[0]);
      assert.deepStrictEqual(area, ['area:kihon', 'area:kihon', 'area:seikatsu', 'area:seikatsu', 'area:seikatsu'],
        'urutan harus per area sesuai objek distribution');
      assert.ok(!sesi.some(q => q.id === 'x1'), 'soal di luar distribution tidak ikut');
      // deterministik dengan seed yang sama
      assert.deepStrictEqual(Array.from(Q.buildSession(quiz, { rng: Q.mulberry32(3) }), q => q.id), Array.from(sesi, q => q.id));
    },
  },
  {
    name: 'buildSession: distribution tidak mengambil soal dua kali, bank kurang diambil seadanya, string JSON diterima',
    fn() {
      const Q = load();
      const quiz = {
        distribution: JSON.stringify({ 'area:a': 2, 'area:b': 2 }),
        ssw_questions: [{ id: 'ab', sort: 1, tags: ['area:a', 'area:b'] }, { id: 'b1', sort: 2, tags: ['area:b'] }],
      };
      const ids = Array.from(Q.buildSession(quiz, {}), q => q.id);
      assert.deepStrictEqual(ids, ['ab', 'b1'], 'soal bertag ganda cukup sekali; area a kekurangan → seadanya');
      // tanpa distribution perilaku lama tetap: urut sort, dipotong question_count
      const lama = Q.buildSession({ question_count: 1, ssw_questions: quiz.ssw_questions, distribution: {} }, {});
      assert.deepStrictEqual(Array.from(lama, q => q.id), ['ab']);
    },
  },
];

module.exports = { tests };
