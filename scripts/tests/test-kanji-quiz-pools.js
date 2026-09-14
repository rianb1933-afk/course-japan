/**
 * Test suite: Pool kuis kanji (Kanji-N5..N1)
 * ===========================================
 * Mencegah regresi kerusakan kuis kanji yang dilaporkan pengguna:
 *   1. Baris koma nyasar membuat lubang (sparse hole) di pool → soal ke-N
 *      melempar "Cannot read properties of undefined".
 *   2. Entri berbentuk 5 field (sisa data lama) → opsi jawaban campur
 *      readings/arti dan counter soal membengkak ("Soal 1/36").
 *   3. Blok <script> inline yang tidak bisa di-parse (sintaks rusak).
 *   4. Kuis modern 10-soal-per-sesi (renderKQN* + kqBoxN*) harus terpasang;
 *      alur lama (startKanjiQuizN* + kqArea*) harus sudah tidak ada.
 *
 * Pool diekstrak dari HTML lama dievaluasi dengan new Function — tanpa DOM.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

function readPage(level) {
  return fs.readFileSync(path.join(ROOT, 'Materi', `Kanji-${level}.html`), 'utf8');
}

function extractPool(html, level) {
  const m = html.match(new RegExp(`const kqPoolN${level[1]} = \\[([\\s\\S]*?)\\];`));
  if (!m) throw new Error(`blok kqPoolN${level[1]} tidak ditemukan`);
  return new Function(`return [${m[1]}];`)();
}

function inlineScripts(html) {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
    .map(m => m[1])
    .filter(s => s.trim().length > 50);
}

const tests = LEVELS.map(level => ({
  name: `Kanji-${level}: pool utuh (tanpa lubang, 4 field, tanpa duplikat)`,
  fn() {
    const pool = extractPool(readPage(level), level);
    if (pool.length < 10) throw new Error(`pool hanya ${pool.length} — kurang untuk sesi 10 soal`);
    pool.forEach((e, i) => {
      if (e === undefined) throw new Error(`lubang array di indeks ${i} (koma nyasar)`);
      if (!Array.isArray(e)) throw new Error(`indeks ${i} bukan array`);
      if (e.length !== 4) throw new Error(`indeks ${i} punya ${e.length} field (harus 4): ${e[0]}`);
      e.forEach((f, j) => {
        if (typeof f !== 'string' || !f.trim()) throw new Error(`indeks ${i} field ${j} kosong`);
      });
    });
    const seen = new Set();
    pool.forEach(e => {
      if (seen.has(e[0])) throw new Error(`kanji ${e[0]} duplikat di pool`);
      seen.add(e[0]);
    });
  },
}));

LEVELS.forEach(level => {
  tests.push({
    name: `Kanji-${level}: semua blok script inline valid`,
    fn() {
      const scripts = inlineScripts(readPage(level));
      scripts.forEach((sc, i) => {
        try { new Function(sc); } catch (e) {
          throw new Error(`script blok ${i} gagal parse: ${e.message}`);
        }
      });
    },
  });
  tests.push({
    name: `Kanji-${level}: kuis modern 10-soal terpasang, alur lama bersih`,
    fn() {
      const html = readPage(level);
      const js = inlineScripts(html).join('\n');
      // kuis modern harus menarget mount kqBoxN* dan men-sample 10 soal
      if (!js.includes(`getElementById('kqBoxN${level[1]}')`)) {
        throw new Error('mount kqBoxN* tidak dipakai kuis modern');
      }
      if (!/shn\d?\(kqPoolN\d\)\.slice\(0,\s*10\)/.test(js) && !js.includes('.slice(0,10)')) {
        throw new Error('sesi 10 soal per sesi tidak ditemukan');
      }
      if (!js.includes(`function renderKQN${level[1]}`)) {
        throw new Error('renderKQN* tidak ditemukan');
      }
      // alur lama harus sudah hilang
      if (/function startKanjiQuizN|id="kqArea\d"/.test(html)) {
        throw new Error('alur kuis lama (startKanjiQuizN*/kqArea*) masih ada');
      }
      // intro harus janji arti (bukan cara baca) + 10 soal
      const intro = html.match(/<p class="sub">([^<]*)<\/p>/);
      if (intro && /cara baca/.test(intro[1])) {
        throw new Error('intro masih menyebut "cara baca" padahal soal menanyakan arti');
      }
    },
  });
});

module.exports = { tests };
