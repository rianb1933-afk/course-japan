/**
 * Test suite: assets/ssw-seed.js — data fallback semua halaman SSW
 * ================================================================
 * Selama Supabase belum dikonfigurasi atau tabel ssw_* masih kosong
 * (keadaan bawaan proyek ini), seed ini SATU-SATUNYA sumber data SSW.
 * Kalau file ini gagal di-parse, window.NP_SSW_SEED tidak pernah ada dan
 * SSW.html diam-diam menampilkan "Belum ada bidang" — tanpa error yang
 * terlihat pengguna.
 *
 * Itu pernah terjadi: lima string body_md multi-baris ditulis dengan kutip
 * tunggal, ditambah dua `],` nyasar yang menutup array modules terlalu
 * dini. `npm test` tetap hijau karena tidak ada test yang benar-benar
 * MENJALANKAN seed-nya; hanya check js-syntax di validate.py yang
 * menangkap. Suite ini menjalankannya di vm dan memeriksa bentuknya —
 * kurung yang salah tempat bisa saja tetap ter-parse tapi menghasilkan
 * array bersarang di tempat yang seharusnya objek modul.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');

function loadSeed() {
  const src = fs.readFileSync(path.join(ROOT, 'assets', 'ssw-seed.js'), 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(src, sandbox, { filename: 'ssw-seed.js', timeout: 1000 });
  if (!sandbox.window.NP_SSW_SEED) throw new Error('window.NP_SSW_SEED tidak terdefinisi');
  return sandbox.window.NP_SSW_SEED;
}

function checkModules(modules, where) {
  if (!Array.isArray(modules)) throw new Error(`${where}.modules bukan array`);
  const lessonIds = new Set();
  modules.forEach((m, i) => {
    if (!m || Array.isArray(m) || typeof m.id !== 'string') {
      throw new Error(`${where}.modules[${i}] bukan objek modul`);
    }
    if (!Array.isArray(m.ssw_lessons)) throw new Error(`${where}: modul ${m.id} tanpa ssw_lessons`);
    m.ssw_lessons.forEach(l => {
      if (typeof l.id !== 'string' || typeof l.title !== 'string') {
        throw new Error(`${where}: lesson tanpa id/title di modul ${m.id}`);
      }
      if (lessonIds.has(l.id)) throw new Error(`${where}: id lesson ganda ${l.id}`);
      lessonIds.add(l.id);
      if ('body_md' in l && typeof l.body_md !== 'string') {
        throw new Error(`${where}: body_md ${l.id} bukan string`);
      }
    });
  });
}

function checkQuizBank(seed, list, where) {
  (list || []).forEach(q => {
    const bank = (seed.quizzes || {})[q.id];
    if (!bank) throw new Error(`${where}: kuis ${q.id} tidak punya bank soal di NP_SSW_SEED.quizzes`);
    const qs = bank.ssw_questions || [];
    if (!qs.length) throw new Error(`bank ${q.id} kosong`);
    qs.forEach(item => {
      if (typeof item.explanation !== 'string' || !item.explanation.trim()) {
        throw new Error(`soal ${q.id}/${item.id} tanpa pembahasan`);
      }
    });
    if (q.question_count && q.question_count > qs.length) {
      throw new Error(`${q.id} menarik ${q.question_count} soal dari bank berisi ${qs.length}`);
    }
  });
}

const tests = [
  {
    name: 'SSW-seed: file tereksekusi dan mendefinisikan window.NP_SSW_SEED',
    fn() { loadSeed(); },
  },
  {
    name: 'SSW-seed: daftar bidang unik dengan nama JP & ID',
    fn() {
      const { categories } = loadSeed();
      if (!Array.isArray(categories) || !categories.length) throw new Error('categories kosong');
      const seen = new Set();
      categories.forEach(c => {
        if (seen.has(c.slug)) throw new Error(`slug bidang ganda: ${c.slug}`);
        seen.add(c.slug);
        if (!c.name_jp || !c.name_id) throw new Error(`bidang ${c.slug} tanpa name_jp/name_id`);
      });
    },
  },
  {
    name: 'SSW-seed: bidang & flag 1号/2号 sama persis dengan INSERT ssw_categories di schema',
    fn() {
      // Dua sumber daftar bidang: seed ini (mode offline) dan schema (DB).
      // Keduanya pernah sama-sama salah dan harus dibetulkan berdua; test ini
      // memastikan yang satu tidak lagi bisa berubah tanpa yang lain.
      const { categories } = loadSeed();
      const sql = fs.readFileSync(path.join(ROOT, 'supabase-schema.sql'), 'utf8');
      const block = sql.match(/INSERT INTO ssw_categories \([^)]*\) VALUES([\s\S]*?)ON CONFLICT \(slug\) DO NOTHING/);
      if (!block) throw new Error('INSERT ssw_categories tidak ditemukan di schema');
      const row = /\(\s*'([^']+)',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*(true|false),\s*(true|false),/g;
      const fromSql = [...block[1].matchAll(row)].map(m => `${m[1]}:${m[2]}:${m[3]}`);
      const fromSeed = categories.map(c => `${c.slug}:${Boolean(c.type1_ok)}:${Boolean(c.type2_ok)}`);
      if (fromSql.join(',') !== fromSeed.join(',')) {
        throw new Error(`berbeda — schema: ${fromSql.join(', ')} | seed: ${fromSeed.join(', ')}`);
      }
      // 介護 bukan bidang 2号 (ISA); jalur lanjutannya visa 介護 via 介護福祉士.
      const kaigo = categories.find(c => c.slug === 'kaigo');
      if (!kaigo || kaigo.type2_ok) throw new Error('介護 tidak boleh ditandai type2_ok');
    },
  },
  {
    name: 'SSW-seed: konten per bidang ada di seed.fields dan konsisten dengan kuncinya',
    fn() {
      const seed = loadSeed();
      // `field` tunggal adalah bentuk lama yang sudah digantikan fields.kaigo;
      // dua salinan pohon yang sama pasti lama-lama berbeda.
      if ('field' in seed) throw new Error('seed.field (bentuk lama) masih ada — pakai seed.fields[slug]');
      if (!seed.fields || !seed.fields.kaigo) throw new Error('seed.fields.kaigo tidak ada');
      const slugs = new Set(seed.categories.map(c => c.slug));
      Object.entries(seed.fields).forEach(([key, f]) => {
        if (!f || f.slug !== key) throw new Error(`fields.${key}.slug harus "${key}"`);
        if (!slugs.has(key)) throw new Error(`fields.${key} bukan bidang yang dikenal categories`);
        checkModules(f.modules, `fields.${key}`);
        ['vocabulary', 'quizzes', 'kanji', 'grammar', 'listening', 'reading'].forEach(kind => {
          if (!Array.isArray(f[kind])) throw new Error(`fields.${key}.${kind} bukan array`);
        });
        checkQuizBank(seed, f.quizzes, `fields.${key}`);
      });
    },
  },
];

module.exports = { tests };
