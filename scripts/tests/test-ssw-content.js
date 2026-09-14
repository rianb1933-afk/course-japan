/**
 * Test suite: assets/ssw-content.js — renderer Kanji/Grammar/Listening/Reading
 * ============================================================================
 * Keempat halaman itu dulu kerangka "segera lengkap". Renderernya menyusun
 * string HTML lalu memasangnya lewat innerHTML, jadi yang paling penting
 * dijaga adalah SEMUA teks data ter-escape — konten datang dari CMS admin.
 *
 * Yang diuji: escaping di setiap field, semua item seed terender, penilaian
 * choice/tf sesuai kontrak baris ssw_* (bukan kontrak kuis), contoh berupa
 * string polos tetap tampil, dan keempat halaman benar-benar memakai modul ini.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');

function load() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'assets', 'ssw-content.js'), 'utf8'), sandbox, { timeout: 1000 });
  const seedBox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'assets', 'ssw-seed.js'), 'utf8'), seedBox, { timeout: 1000 });
  return { C: sandbox.window.SSWContent, seed: seedBox.window.NP_SSW_SEED };
}

const XSS = '"><img src=x onerror=alert(1)>';
function noRawTag(html, where) {
  if (/<img/i.test(html) || /<script/i.test(html)) throw new Error(`${where}: payload lolos tanpa escape`);
  if (!html.includes('&lt;img')) throw new Error(`${where}: payload tidak muncul ter-escape`);
}

const tests = [
  {
    name: 'SSW-content: setiap field data ter-escape di keempat renderer',
    fn() {
      const { C } = load();
      const q = [{ type: 'choice', question: XSS, choices: [XSS, 'b'], correct: 0, explanation: XSS },
                 { type: 'tf', question: XSS, correct: true, explanation: XSS }];
      noRawTag(C.renderKanji({ id: XSS, kanji: XSS, onyomi: XSS, kunyomi: XSS, furigana: XSS, meaning_id: XSS,
        examples: [{ word: XSS, reading: XSS, meaning_id: XSS }], sentence: XSS, sentence_furigana: XSS, sentence_id: XSS }, 0), 'kanji');
      noRawTag(C.renderGrammar({ id: XSS, pattern: XSS, meaning_id: XSS, explanation: XSS, structure: XSS,
        examples: [{ jp: XSS, furigana: XSS, id: XSS }], notes: XSS }, 0), 'grammar');
      noRawTag(C.renderListening({ id: XSS, title: XSS, audio_text: XSS, transcript: XSS, transcript_furigana: XSS,
        translation_id: XSS, questions: q }, 0), 'listening');
      noRawTag(C.renderReading({ id: XSS, title: XSS, text: XSS, furigana_text: XSS, translation_id: XSS,
        vocab: [{ term: XSS, reading: XSS, meaning_id: XSS }], questions: q }, 0), 'reading');
    },
  },
  {
    name: 'SSW-content: semua item seed kaigo terender dengan teks utamanya',
    fn() {
      const { C, seed } = load();
      const k = seed.fields.kaigo;
      const cases = [['kanji', C.renderKanji, 'kanji'], ['grammar', C.renderGrammar, 'pattern'],
                     ['listening', C.renderListening, 'title'], ['reading', C.renderReading, 'title']];
      cases.forEach(([kind, render, key]) => {
        if (!k[kind].length) throw new Error(`seed tidak punya ${kind}`);
        k[kind].forEach((item, i) => {
          const html = render(item, i);
          if (!html.includes(C.esc(item[key]))) throw new Error(`${kind} ${item.id}: "${item[key]}" tidak tampil`);
          if (!html.includes(`data-kind="${kind}"`)) throw new Error(`${kind} ${item.id}: tombol progres salah jenis`);
        });
      });
      // Soal seed hanya choice/tf — tipe lain tidak akan dinilai.
      [...k.listening, ...k.reading].forEach(x => x.questions.forEach(q => {
        if (!['choice', 'tf'].includes(q.type)) throw new Error(`${x.id}: tipe soal ${q.type} tidak dinilai renderer`);
      }));
    },
  },
  {
    name: 'SSW-content: penilaian mengikuti kontrak baris ssw_* (correct), tipe asing tidak dinilai',
    fn() {
      const { C } = load();
      const choice = { type: 'choice', correct: 2 };
      if (C.grade(choice, '2') !== true || C.grade(choice, '1') !== false) throw new Error('choice salah');
      const tfFalse = { type: 'tf', correct: false };
      if (C.grade(tfFalse, 'false') !== true || C.grade(tfFalse, 'true') !== false) throw new Error('tf salah');
      if (C.grade({ type: 'blank', correct: 'x' }, 'x') !== null) throw new Error('tipe asing harus null');
      // kontrak kuis (answer.index) BUKAN kontrak konten — tidak boleh dianggap benar
      if (C.grade({ type: 'choice', answer: { index: 0 } }, '0') !== false) throw new Error('answer.index tidak boleh dipakai');
    },
  },
  {
    name: 'SSW-content: contoh/kosakata berupa string polos (isian admin) tetap tampil',
    fn() {
      const { C } = load();
      if (!C.renderKanji({ id: 'k', kanji: '安', meaning_id: 'aman', examples: ['安全確認'] }, 0).includes('安全確認')) throw new Error('kanji');
      if (!C.renderGrammar({ id: 'g', pattern: 'p', meaning_id: 'm', examples: ['見てください'] }, 0).includes('見てください')) throw new Error('grammar');
      if (!C.renderReading({ id: 'r', title: 't', text: 'x', vocab: ['利用者'] }, 0).includes('利用者')) throw new Error('reading');
    },
  },
  {
    name: 'SSW-content: keempat halaman memuat modul ini dan me-mount jenisnya sendiri',
    fn() {
      [['Kanji', 'kanji'], ['Grammar', 'grammar'], ['Listening', 'listening'], ['Reading', 'reading']].forEach(([page, kind]) => {
        const html = fs.readFileSync(path.join(ROOT, 'SSW', page + '.html'), 'utf8');
        if (html.includes('segera lengkap')) throw new Error(`${page}.html masih kerangka "segera lengkap"`);
        const seedAt = html.indexOf('/assets/ssw-seed.js');
        const contentAt = html.indexOf('/assets/ssw-content.js');
        if (seedAt === -1 || contentAt === -1 || contentAt < seedAt) throw new Error(`${page}.html: urutan script seed → content salah`);
        if (!html.includes(`SSWContent.mount('${kind}'`)) throw new Error(`${page}.html tidak me-mount '${kind}'`);
        if (!html.includes('id="sswItems"') || !html.includes('id="sswEmpty"')) throw new Error(`${page}.html: wadah hilang`);
      });
    },
  },
];

module.exports = { tests };
