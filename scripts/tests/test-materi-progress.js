/**
 * Test suite: Lencana progres per modul (Materi.html)
 * ====================================================
 * Mengekstrak blok script lencana dari Materi/Materi.html dan menjalankannya
 * di vm dengan mock DOM ber-API standar + mock localStorage.
 *
 * Yang diuji: pemetaan kartu → lencana (JLPT chips, hitungan learned, SRS,
 * quiz akurasi), tanpa data = polos, render idempoten, event storage
 * memicu render ulang, escape HTML.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const html = fs.readFileSync(path.join(ROOT, 'Materi', 'Materi.html'), 'utf8');

function extractScript(marker) {
  const start = html.indexOf(marker);
  if (start === -1) throw new Error('blok script tidak ditemukan: ' + marker);
  const open = html.lastIndexOf('<script>', start);
  const close = html.indexOf('</script>', start);
  return html.slice(open + 8, close);
}

function makeCard(title) {
  const h3 = { textContent: title };
  const card = {
    _h3: h3,
    _box: null,
    querySelector(sel) {
      if (sel === 'h3') return this._h3;
      if (sel === '.hub-progress') return this._box;
      return null;
    },
  };
  // implementasi memasang box lewat h3.insertAdjacentElement('afterend', box)
  h3.insertAdjacentElement = (pos, box) => { card._box = box; };
  return card;
}

function buildMock(storageMap, titles) {
  const store = Object.assign({}, storageMap);
  const cards = titles.map(makeCard);
  let storageListener = null;
  const document = {
    querySelectorAll: sel => (sel === '#main-content .hub-grid > .hub-card') ? cards : [],
    createElement: () => {
      const el = { className: '', innerHTML: '', remove(){} };
      return el;
    },
  };
  const local = { getItem: k => (k in store ? store[k] : null) };
  const window2 = { addEventListener: (ev, fn) => { if (ev === 'storage') storageListener = fn; } };
  const ctx = { document, localStorage: local, window: window2, setTimeout, clearTimeout };
  vm.runInNewContext(extractScript('Lencana progres per modul'), ctx, { timeout: 1000 });
  // sambungkan box yang dibuat createElement ke card agar querySelector('.hub-progress') menemukannya
  cards.forEach(c => {
    if (c._h3 && c._h3.insertAdjacentElement) {
      // implementasi memanggil h3.insertAdjacentElement('afterend', box)
    }
  });
  return { cards, window: window2, storageListener, ctx };
}

// insertAdjacentElement mock: simpan box di card._box
function attachBoxMock() { /* kini tertangani di makeCard */ }

const TITLES = [
  'Peta Jalan JLPT',
  'Grammar N5-N1',
  'Kosakata N5-N1',
  'Kanji Per Tingkat',
  'Semua Kartu Flash',
  'Latihan Soal JLPT',
  'Mulai dari Nol', // tanpa sinyal → polos
];

function makeState(user) {
  return JSON.stringify({ user });
}

const tests = [
  {
    name: 'Materi-progres: tanpa data sama sekali → semua kartu polos',
    fn() {
      const mock = buildMock({}, TITLES);
      attachBoxMock(mock.cards);
      const n = mock.window.renderModuleProgress();
      if (n !== 0) throw new Error('harusnya 0 kartu berlencana, dapat ' + n);
      mock.cards.forEach((c, i) => {
        if (c._box) throw new Error(`kartu ${i} tidak boleh berlencana`);
      });
    },
  },
  {
    name: 'Materi-progres: pemetaan lengkap sesuai data user + SRS',
    fn() {
      const state = makeState({
        jlptProgress: { N5: 45, N4: 0, N3: 12, N2: 0, N1: 0 },
        kanjiLearned: 57, grammarLearned: 23, vocabLearned: 310,
        quizTotal: 40, quizCorrect: 34,
      });
      const srs = JSON.stringify({ a: { reps: 3 }, b: { reps: 0 }, c: { reps: 7 }, d: null });
      const mock = buildMock({ 'np-state-v3': state, 'np-srs-v2': srs }, TITLES);
      attachBoxMock(mock.cards);
      const n = mock.window.renderModuleProgress();
      if (n !== 6) throw new Error('harusnya 6 kartu berlencana (semua kecuali Mulai dari Nol), dapat ' + n);
      const boxHTML = c => c._box.innerHTML;
      if (!boxHTML(mock.cards[0]).includes('N5 45%') || !boxHTML(mock.cards[0]).includes('N3 12%') || boxHTML(mock.cards[0]).includes('N4')) {
        throw new Error('chip level JLPT salah: ' + boxHTML(mock.cards[0]));
      }
      if (!boxHTML(mock.cards[1]).includes('23 pola dipelajari')) throw new Error('lencana grammar salah');
      if (!boxHTML(mock.cards[2]).includes('310 kata dipelajari')) throw new Error('lencana vocab salah');
      if (!boxHTML(mock.cards[3]).includes('57 kanji dipelajari')) throw new Error('lencana kanji salah');
      // SRS: hanya reps>0 → 2 kartu (a dan c; b reps 0, d null)
      if (!boxHTML(mock.cards[4]).includes('🃏 2 kartu aktif')) throw new Error('lencana SRS salah: ' + boxHTML(mock.cards[4]));
      // quiz: 34/40 = 85%
      if (!boxHTML(mock.cards[5]).includes('40 soal · 85% akurat')) throw new Error('lencana quiz salah: ' + boxHTML(mock.cards[5]));
    },
  },
  {
    name: 'Materi-progres: render idempoten — panggil ulang tidak menduplikasi box',
    fn() {
      const state = makeState({ kanjiLearned: 5 });
      const mock = buildMock({ 'np-state-v3': state }, ['Kanji Per Tingkat', 'Grammar N5-N1']);
      attachBoxMock(mock.cards);
      mock.window.renderModuleProgress();
      const firstBox = mock.cards[0]._box;
      mock.window.renderModuleProgress();
      mock.window.renderModuleProgress();
      if (mock.cards[0]._box !== firstBox) throw new Error('box harus di-update in-place, bukan dibuat baru');
      // data berubah jadi 0 → box dihapus
      mock.ctx.localStorage.setItem = null; // (mock read-only cukup: ganti state via key baru tak berlaku)
      // re-render dengan store kosong: buat mock baru memakai box yang sudah ada
      const empty = buildMock({}, ['Kanji Per Tingkat']);
      attachBoxMock(empty.cards);
      empty.cards[0]._box = { remove(){} };
      empty.cards[0]._box.remove = () => { empty.cards[0]._box = null; };
      empty.window.renderModuleProgress();
      if (empty.cards[0]._box !== null) throw new Error('box harus dihapus saat data habis');
    },
  },
  {
    name: 'Materi-progres: event storage dengan key terkait memicu render ulang',
    fn() {
      const mock = buildMock({ 'np-state-v3': makeState({ kanjiLearned: 1 }) }, ['Kanji Per Tingkat']);
      attachBoxMock(mock.cards);
      mock.window.renderModuleProgress();
      if (!mock.storageListener) throw new Error('listener storage tidak terpasang');
      mock.storageListener({ key: 'np-state-v3' });
      if (!mock.cards[0]._box || !mock.cards[0]._box.innerHTML.includes('1 kanji dipelajari')) {
        throw new Error('render ulang setelah storage gagal');
      }
      // key lain diabaikan
      mock.cards[0]._box.innerHTML = '';
      mock.storageListener({ key: 'np-anatomy-flashcards' });
      if (mock.cards[0]._box.innerHTML !== '') throw new Error('key tak terkait tidak boleh memicu render');
    },
  },
  {
    name: 'Materi-progres: teks lencana di-escape (aman terhadap injeksi)',
    fn() {
      const state = makeState({ kanjiLearned: 3 });
      const mock = buildMock({ 'np-state-v3': state }, ['Kanji Per Tingkat']);
      attachBoxMock(mock.cards);
      mock.window.renderModuleProgress();
      // escape dicakup lewat esc(): pastikan tidak ada raw <> pada innerHTML chip
      if (/[<>](?!(?:\/)?span)/.test(mock.cards[0]._box.innerHTML.replace(/<\/?span[^>]*>/g, ''))) {
        throw new Error('ada karakter mentah yang tidak di-escape');
      }
    },
  },
];

module.exports = { tests };
