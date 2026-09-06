/**
 * Test suite: Pengocokan pilihan jawaban kuis anatomi
 * ====================================================
 * Menguji anatomy-quiz.js: ke-34 soal menyimpan jawaban benar di indeks 0
 * (a:0, pola warisan), sehingga sebelumnya klik opsi pertama SELALU benar.
 * Kini urutan tombol dikocok Fisher-Yates saat render, dengan pick()
 * menerjemahkan posisi tombol kembali ke indeks opsi asli — scoring & data
 * tidak berubah.
 *
 * Modul dimuat via vm (pola load-platform) dengan DOM palsu minimal:
 * elemen yang dirujuk $(id) + document.createElement('button') +
 * querySelectorAll('.q-choice') pada wadah qChoices.
 *
 * Determinisme: posisi diacak Math.random, jadi keberagaman diverifikasi
 * statistik — 120 render soal 0 harus memunculkan KEEMPAT posisi (peluang
 * gagal salah satu tak muncul = (3/4)^120 ≈ 2.5e-15), bukan satu-dua draw.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'anatomy', 'anatomy-quiz.js'), 'utf8');

// ── Data soal asli diekstrak dari sumber (untuk membandingkan teks jawaban) ──
const m = SRC.match(/var Q = (\[[\s\S]*?\]);\n/);
assert.ok(m, 'array Q tidak ditemukan di anatomy-quiz.js');
// Q berisi key tanpa kutip (q/opts/a/e) — dievaluasi lokal, sumber repo sendiri:
const Q2 = eval('[' + m[1].slice(1, -1) + ']');

// ── DOM palsu minimal ─────────────────────────────────────────────
function makeEl(id) {
  const el = {
    id, textContent: '', innerHTML: '', disabled: false, style: {},
    _children: [], _cls: new Set(), _handlers: {},
    classList: {
      add: (c) => el._cls.add(c),
      remove: (c) => el._cls.delete(c),
      contains: (c) => el._cls.has(c),
    },
    addEventListener(type, fn) { (el._handlers[type] = el._handlers[type] || []).push(fn); },
    click() { (el._handlers.click || []).forEach((fn) => fn()); },
    appendChild(c) { el._children.push(c); },
    // 'innerHTML = ""' harus benar-benar mengosongkan anak — kalau tidak, tombol
    // sesi sebelumnya menempel dan posisi jawaban terbaca salah.
    set innerHTML(v) { if (v === '') el._children.length = 0; },
    querySelectorAll(sel) {
      if (sel === '.q-choice') return el._children.filter((c) => c._cls.has('q-choice') || c.className === 'q-choice');
      return [];
    },
  };
  return el;
}

function loadQuiz() {
  const els = {};
  ['qProgress', 'qText', 'qExpl', 'qChoices', 'qNextBtn', 'qPanel', 'quizResult', 'quizScoreVal', 'quizScoreMsg', 'quizRetryBtn']
    .forEach((id) => { els[id] = makeEl(id); });

  const documentMock = {
    getElementById: (id) => els[id] || null,
    createElement: () => makeEl('btn'),
    dispatchEvent: () => true,
  };
  const sandbox = {
    window: {},
    document: documentMock,
    CustomEvent: function (type, opts) { this.type = type; this.detail = opts && opts.detail; },
    Math, JSON, setTimeout: () => 0,
  };
  sandbox.globalThis = sandbox.window;
  // Modul dieksekusi dengan (window) sebagai argumen IIFE-nya — global modul
  // adalah sandbox.window, jadi NPAnatomyQuiz dibaca dari situ.
  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox);
  return { quiz: sandbox.window.NPAnatomyQuiz, els, sandbox };
}

function choiceButtons(els) { return els.qChoices.querySelectorAll('.q-choice'); }

function posisiJawabanBenar(els, q) {
  const teks = q.opts[q.a];
  const btns = choiceButtons(els);
  const idx = btns.findIndex((b) => b.textContent === teks);
  assert.ok(idx >= 0, 'tombol dengan teks jawaban benar tidak ditemukan: ' + teks);
  return idx;
}

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// ── Tests ────────────────────────────────────────────────────────

test('data soal utuh: 34 soal, semua masih a:0 (pengocokan memang diperlukan)', () => {
  assert.strictEqual(Q2.length, 34);
  Q2.forEach((q, i) => {
    assert.strictEqual(q.a, 0, 'soal ' + i + ' seharusnya masih data asli a:0');
    assert.strictEqual(q.opts.length, 4, 'soal ' + i + ' harus 4 pilihan');
  });
});

test('posisi jawaban benar BERVARIASI di 120 render soal pertama (keempat posisi muncul)', () => {
  const { els } = loadQuiz();
  const q = Q2[0];
  const seen = new Set();
  for (let i = 0; i < 120; i++) {
    // render ulang: klik retry merender ulang soal 0 dengan urutan baru
    els.quizRetryBtn.click();
    seen.add(posisiJawabanBenar(els, q));
  }
  assert.deepStrictEqual([...seen].sort(), [0, 1, 2, 3],
    'keempat posisi harus muncul dalam 120 render; didapat: ' + [...seen]);
});

test('posisi bervariasi juga pada soal lain (sampel soal 1, 5, 33)', () => {
  for (const qi of [1, 5, 33]) {
    const { quiz, els } = loadQuiz();
    const q = Q2[qi];
    const seen = new Set();
    // maju ke soal qi: jawab soal-soal sebelumnya (klik apa saja lalu next)
    for (let i = 0; i < qi; i++) {
      choiceButtons(els)[0].click();
      els.qNextBtn.click();
    }
    for (let i = 0; i < 40; i++) {
      els.quizRetryBtn.click(); // kembali ke soal 0...
      for (let j = 0; j < qi; j++) { choiceButtons(els)[0].click(); els.qNextBtn.click(); }
      seen.add(posisiJawabanBenar(els, q));
    }
    assert.ok(seen.size >= 2, 'soal ' + qi + ': posisi harus bervariasi; didapat ' + [...seen]);
  }
});

test('klik tombol ber-teks jawaban benar SELALU ditandai correct (pemetaan order→asli benar)', () => {
  const { els } = loadQuiz();
  const q = Q2[0];
  for (let i = 0; i < 40; i++) {
    els.quizRetryBtn.click();
    const pos = posisiJawabanBenar(els, q);
    choiceButtons(els)[pos].click();
    const btns = choiceButtons(els);
    assert.ok(btns[pos].classList.contains('correct'),
      'render ' + i + ' pos ' + pos + ': tombol jawaban benar tidak mendapat class correct');
    // tepat satu tombol correct, tanpa wrong
    const nCorrect = btns.filter((b) => b.classList.contains('correct')).length;
    const nWrong = btns.filter((b) => b.classList.contains('wrong')).length;
    assert.strictEqual(nCorrect, 1, 'harus tepat satu correct');
    assert.strictEqual(nWrong, 0, 'klik jawaban benar tidak boleh menandai wrong');
  }
});

test('klik tombol salah menandai wrong pada tombol itu + correct pada jawaban sebenarnya', () => {
  const { els } = loadQuiz();
  const q = Q2[0];
  const teksBenar = q.opts[q.a];
  for (let i = 0; i < 30; i++) {
    els.quizRetryBtn.click();
    const posBenar = posisiJawabanBenar(els, q);
    const posSalah = (posBenar + 1) % 4; // tetangga kanan = pasti salah
    choiceButtons(els)[posSalah].click();
    const btns = choiceButtons(els);
    assert.ok(btns[posSalah].classList.contains('wrong'), 'tombol yang diklik harus wrong');
    assert.ok(btns[posBenar].classList.contains('correct'), 'jawaban sebenarnya harus tetap correct');
    assert.notStrictEqual(btns[posSalah].textContent, teksBenar);
  }
});

test('sesi penuh: jawab semua soal lewat teks jawaban benar → skor 100%', () => {
  const { els } = loadQuiz();
  Q2.forEach((q) => {
    const pos = posisiJawabanBenar(els, q);
    choiceButtons(els)[pos].click();
    els.qNextBtn.click();
  });
  assert.strictEqual(els.quizResult.style.display, 'block', 'panel hasil harus tampil');
  assert.strictEqual(els.quizScoreVal.textContent, '100%', 'skor harus 100%');
});

test('sesi penuh: selalu klik opsi PERTAMA TIDAK lagi selalu benar (skor ≠ 100%)', () => {
  // Buktikan lubang lama tertutup: dengan jawaban selalu di indeks 0, klik
  // butir pertama dulu menghasilkan 100%. Setelah dikocok, 34 soal hampir
  // mustahil sempurna lewat pola tetap (peluang ≈ (1/4)^34). Cukup assert <100
  // dengan seed hasil nyata — tetap deterministik karena 120 render tuntas.
  const { els } = loadQuiz();
  Q2.forEach(() => {
    choiceButtons(els)[0].click();
    els.qNextBtn.click();
  });
  assert.notStrictEqual(els.quizScoreVal.textContent, '100%',
    'klik pola tetap (tombol pertama) tidak boleh menghasilkan 100%');
});

test('retry mengacak ulang: dua sesi berurutan punya urutan berbeda minimal sekali', () => {
  const { els } = loadQuiz();
  const q = Q2[0];
  const seq1 = [];
  for (let i = 0; i < 8; i++) { els.quizRetryBtn.click(); seq1.push(posisiJawabanBenar(els, q)); }
  const seq2 = [];
  for (let i = 0; i < 8; i++) { els.quizRetryBtn.click(); seq2.push(posisiJawabanBenar(els, q)); }
  let differs = false;
  for (let i = 0; i < 8; i++) if (seq1[i] !== seq2[i]) { differs = true; break; }
  assert.ok(differs, 'dua rangkaian 8 render hampir pasti berbeda urutannya');
});

module.exports = { tests };
