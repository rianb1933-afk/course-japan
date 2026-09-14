/**
 * Test suite: scripts/build-ssw-content.js — pipeline kurikulum SSW
 * =================================================================
 * Generator menulis dua keluaran dari scripts/ssw-curriculum/: blok SQL di
 * supabase-schema.sql (jalur DB) dan assets/ssw-content/*.json (cadangan
 * statis). Yang dijaga:
 *   - sumbernya lolos validasi dan keluarannya TIDAK basi (gerbang, sama
 *     seperti build:check untuk bundel .min);
 *   - JSON statis berbentuk seed.fields yang dibaca assets/ssw-api.js;
 *   - blok SQL terbaca audit dengan relasi slug yang utuh, dan upsert-nya
 *     hanya menimpa baris bertag 'generated';
 *   - fallback ssw-api benar-benar menggabungkan konten statis dengan contoh
 *     seed dan menemukan bank kuis lewat awalan id.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const { build, BEGIN, END } = require(path.join(ROOT, 'scripts', 'build-ssw-content.js'));
const { loadContent } = require(path.join(ROOT, 'scripts', 'audit-ssw-content.js'));

let cached;
const result = () => (cached = cached || build());

const tests = [
  {
    name: 'SSW-build: sumber kurikulum lolos validasi dan keluaran generator tidak basi (GERBANG)',
    fn() {
      const res = result();
      if (res.errors.length) throw new Error(res.errors.slice(0, 5).join(' | '));
      const stale = Object.entries(res.files)
        .filter(([p, s]) => !fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== s)
        .map(([p]) => path.relative(ROOT, p));
      if (stale.length) throw new Error('keluaran basi: ' + stale.join(', ') + ' — jalankan node scripts/build-ssw-content.js');
    },
  },
  {
    name: 'SSW-build: JSON statis berbentuk seed.fields (modul → lesson, jenis konten, bank kuis)',
    fn() {
      const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'ssw-content', 'index.json'), 'utf8'));
      if (!Array.isArray(idx.fields) || !idx.fields.length) throw new Error('index.json tanpa daftar bidang');
      idx.fields.forEach(slug => {
        const f = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'ssw-content', slug + '.json'), 'utf8'));
        if (f.slug !== slug) throw new Error(`${slug}.json slug salah`);
        f.modules.forEach(m => {
          if (!m.id || !Array.isArray(m.ssw_lessons) || !m.ssw_lessons.length) throw new Error(`${m.id}: lesson kosong`);
          m.ssw_lessons.forEach(l => { if (!l.id || !l.body_md) throw new Error(`${l.id}: lesson tanpa isi`); });
        });
        ['vocabulary', 'kanji', 'grammar', 'listening', 'reading', 'quizzes'].forEach(k => {
          if (!Array.isArray(f[k])) throw new Error(`${slug}.${k} bukan array`);
        });
        f.quizzes.forEach(q => {
          const bank = f.quizBanks[q.id];
          if (!bank || !bank.ssw_questions.length) throw new Error(`kuis ${q.id} tanpa bank soal`);
          if (!q.id.startsWith(slug + '-')) throw new Error(`id kuis ${q.id} harus berawalan ${slug}- (dipakai getQuiz)`);
          bank.ssw_questions.forEach(x => {
            if (!x.tags.some(t => t.startsWith('area:'))) throw new Error(`${x.id} tanpa tag area (mock & remedial)`);
          });
        });
      });
    },
  },
  {
    name: 'SSW-build: blok SQL terbaca audit — lesson & soal tertaut lewat slug, upsert hanya menimpa baris generated',
    fn() {
      const schema = fs.readFileSync(path.join(ROOT, 'supabase-schema.sql'), 'utf8');
      // tanpa baris komentar: kepala blok MENJELASKAN "ON CONFLICT … DO NOTHING"
      const block = schema.slice(schema.indexOf(BEGIN), schema.indexOf(END)).replace(/^--.*$/gm, '');
      const statics = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'ssw-content', 'kaigo.json'), 'utf8'));
      const { fields, orphans } = loadContent(schema);
      if (orphans.length) throw new Error(JSON.stringify(orphans.slice(0, 3)));
      statics.modules.forEach(m => {
        const got = fields.kaigo.lessons.filter(l => l.slug.startsWith(m.id + '-')).length;
        if (got !== m.ssw_lessons.length) throw new Error(`${m.id}: SQL punya ${got} lesson, statis ${m.ssw_lessons.length}`);
      });
      const inserts = (block.match(/^INSERT INTO/gm) || []).length;
      const guarded = (block.match(/^ {2}WHERE ssw_\w+\.tags @> '\{generated\}';$/gm) || []).length;
      if (!inserts || inserts !== guarded) throw new Error(`${inserts} INSERT, hanya ${guarded} yang dijaga WHERE tags @> '{generated}'`);
      if (/ON CONFLICT[^;]*DO NOTHING/.test(block)) throw new Error('blok generated tidak boleh DO NOTHING — perbaikan konten harus ikut terbawa');
      // Blok harus di atas konten tulisan tangan: kunci yang sama milik generator.
      if (schema.indexOf(END) > schema.indexOf('INSERT INTO ssw_vocabulary (category_id, term, furigana, romaji, meaning_id, meaning_en, example, example_furigana, example_id, level, tags) VALUES')) {
        throw new Error('blok SSW-CONTENT harus sebelum INSERT kosakata tulisan tangan');
      }
    },
  },
  {
    name: 'SSW-build: fallback ssw-api menggabungkan konten statis + contoh seed dan menemukan bank kuis',
    fn: async () => {
      const kaigo = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'ssw-content', 'kaigo.json'), 'utf8'));
      const seedBox = { window: {} };
      vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'assets', 'ssw-seed.js'), 'utf8'), seedBox);
      const files = { '/assets/ssw-content/index.json': { fields: ['kaigo'] }, '/assets/ssw-content/kaigo.json': kaigo };
      const asked = [];
      const sandbox = {
        window: { EDUMA_ENV: {}, NP_SSW_SEED: seedBox.window.NP_SSW_SEED },
        localStorage: { getItem: () => null, setItem: () => {} },
        console, Date, Math, JSON, Promise, encodeURIComponent,
        fetch: async url => {
          const u = String(url).split('?')[0];
          asked.push(u);
          return files[u] ? { ok: true, json: async () => files[u] } : { ok: false, json: async () => null };
        },
      };
      sandbox.window.localStorage = sandbox.localStorage;
      vm.createContext(sandbox);
      vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets', 'ssw-api.js'), 'utf8'), sandbox);
      const API = sandbox.window.SSWAPI;

      const tree = await API.getFieldTree('kaigo');
      const ids = Array.from(tree.modules, m => m.id);
      if (!ids.includes('kaigo-m05')) throw new Error('modul hasil generator tidak muncul: ' + ids.join(','));
      if (!ids.includes('m-kaigo-1')) throw new Error('modul contoh seed hilang setelah digabung');
      const vocab = (await API.getItems('kaigo', 'vocabulary')).items;
      const ijou = vocab.filter(v => v.term === '移乗');
      if (ijou.length !== 1 || !String(ijou[0].id).startsWith('kaigo-v-')) throw new Error('kunci sama harus satu, versi generator yang menang');
      const { quiz } = await API.getQuiz('kaigo-m05-quiz');
      if (!quiz || quiz.ssw_questions.length !== kaigo.quizBanks['kaigo-m05-quiz'].ssw_questions.length) throw new Error('bank kuis statis tidak ditemukan lewat awalan id');
      // Bidang tanpa file statis: index dibaca, file bidangnya tidak diminta (tanpa 404).
      await API.getItems('nougyou', 'vocabulary');
      if (asked.includes('/assets/ssw-content/nougyou.json')) throw new Error('bidang yang tidak ada di index tetap diminta → 404 di konsol');
    },
  },
];

module.exports = { tests };
