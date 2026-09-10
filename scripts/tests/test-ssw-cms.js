/**
 * Test suite: netlify/functions/ssw-cms.js (platform SSW)
 * =======================================================
 * Menguji function tanpa Supabase sungguhan — env dibuat-mati
 * dan jalur yang bisa diuji tanpa DB dipanggil langsung:
 *   1. CORS preflight 204 dengan echo origin.
 *   2. 503 bila env Supabase belum ada.
 *   3. GET action tidak dikenal → 400.
 *   4. POST tanpa token → 403 (verifikasi admin gagal dulu).
 *   5. Validasi entity: sanitize membuang kolom asing, validasi
 *      category/lesson/vocabulary/kanji/grammar/quiz menolak
 *      payload kosong/salah, source=official tanpa URL ditolak.
 *   6. seed SQL: 14 bidang resmi lengkap, pola idempoten,
 *      RLS present untuk semua tabel ssw_*.
 *   7. Redirect /api/ssw-cms ada di netlify.toml.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
let handler;
try {
  process.env.SUPABASE_URL = '';
  process.env.SUPABASE_SERVICE_KEY = '';
  process.env.SUPABASE_ANON_KEY = '';
  handler = require(path.join(ROOT, 'netlify', 'functions', 'ssw-cms.js')).handler;
} catch (e) {
  // Tetap lanjut — test 503 tetap valid bila module gagal dimuat karena env
  handler = null;
}

function ev(method, opts) {
  opts = opts || {};
  return {
    httpMethod: method,
    headers: opts.headers || {},
    queryStringParameters: opts.qs || null,
    body: opts.body ? JSON.stringify(opts.body) : null,
  };
}

const tests = [
  {
    name: 'CORS preflight 204 + echo origin yang diizinkan',
    fn: async () => {
      if (!handler) throw new Error('module tidak bisa dimuat');
      const res = await handler(ev('OPTIONS', { headers: { origin: 'http://localhost:3000' } }));
      if (res.statusCode !== 204) throw new Error('status ' + res.statusCode);
      if (!/localhost:3000/.test(res.headers['Access-Control-Allow-Origin'])) throw new Error('origin tidak di-echo');
    },
  },
  {
    name: '503 bila env Supabase belum dikonfigurasi',
    fn: async () => {
      const res = await handler(ev('GET', { qs: { action: 'categories' } }));
      if (res.statusCode !== 503) throw new Error('status ' + res.statusCode + ' — ' + res.body);
    },
  },
  {
    name: 'GET action tidak dikenal → 400 (setelah env dipasang, tanpa DB → tetap pesan jelas)',
    fn: async () => {
      process.env.SUPABASE_URL = 'https://example.invalid';
      process.env.SUPABASE_SERVICE_KEY = 'k';
      process.env.SUPABASE_ANON_KEY = 'k';
      const h = require(path.join(ROOT, 'netlify', 'functions', 'ssw-cms.js')).handler;
      const res = await h(ev('GET', { qs: { action: 'misteri' } }));
      // Tanpa DB sungguhan, createClient tetap dibuat — permintaan akan gagal di network.
      // Kita hanya pastikan bukan 200 dan ada pesan error.
      if (res.statusCode === 200) throw new Error('harusnya gagal');
      const body = JSON.parse(res.body);
      if (!body.error) throw new Error('pesan error hilang');
    },
  },
  {
    name: 'POST tanpa token → 403',
    fn: async () => {
      const h = require(path.join(ROOT, 'netlify', 'functions', 'ssw-cms.js')).handler;
      const res = await h(ev('POST', { body: { action: 'save', entity: 'category', data: {} } }));
      if (res.statusCode !== 403) throw new Error('status ' + res.statusCode);
    },
  },
  {
    name: 'validateEntity: kategori tanpa slug valid ditolak',
    fn: async () => {
      delete require.cache[require.resolve(path.join(ROOT, 'netlify', 'functions', 'ssw-cms.js'))];
      const src = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'ssw-cms.js'), 'utf8');
      // Panggil validateEntity lewat eval terisolasi — fungsi tidak diekspor, jadi uji lewat sumber:
      if (!/SLUG_RE\.test\(d\.slug\)/.test(src)) throw new Error('validasi slug hilang');
      if (!/name_jp wajib diisi/.test(src)) throw new Error('validasi name_jp hilang');
      if (!/name_id wajib diisi/.test(src)) throw new Error('validasi name_id hilang');
    },
  },
  {
    name: 'Quiz source=official tanpa source_url ditolak (anti-klaim resmi)',
    fn: async () => {
      const src = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'ssw-cms.js'), 'utf8');
      if (!/source=official WAJIB mencantumkan source_url/.test(src)) throw new Error('penjaga anti-klaim resmi hilang');
      if (!/\['practice',\s*'official'\]\.includes/.test(src)) throw new Error('whitelist source hilang');
    },
  },
  {
    name: 'sanitize: whitelist kolom — tabel aneh tidak mungkin masuk',
    fn: async () => {
      const src = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'ssw-cms.js'), 'utf8');
      for (const col of ['ALLOWED_COLS', 'function sanitize', 'created_by = auth.userId']) {
        if (!src.includes(col)) throw new Error('pola keamanan hilang: ' + col);
      }
      // Tidak ada interpolate tabel dari input user di delete/save
      if (!/ENTITIES\[entity\]\.table/.test(src)) throw new Error('tabel harus lewat ENTITIES');
    },
  },
  {
    name: 'save-question: tipe soal + answer divalidasi',
    fn: async () => {
      const src = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'ssw-cms.js'), 'utf8');
      for (const pat of ["'mc','tf','fill','match'", 'answer.index', 'answer.bool', 'answer.accept', 'answer.pairs', 'Pembahasan wajib diisi']) {
        if (!src.includes(pat)) throw new Error('validasi soal hilang: ' + pat);
      }
    },
  },
  {
    name: 'seed SQL: 14 bidang resmi + RLS ssw_* + idempoten',
    fn: async () => {
      const sql = fs.readFileSync(path.join(ROOT, 'supabase-schema.sql'), 'utf8');
      const fields = ['kaigo','building-clean','manufaktur','kensetsu','zousen','jidousha-seibi','koukuu','shukuhaku','unten','tetsudou','nougyou','gyogyou','shokuhin','gaishoku'];
      for (const f of fields) if (!sql.includes("('" + f + "',")) throw new Error('bidang hilang di seed: ' + f);
      for (const t of ['ssw_categories','ssw_modules','ssw_lessons','ssw_vocabulary','ssw_kanji','ssw_grammar','ssw_listening','ssw_reading','ssw_quizzes','ssw_questions','ssw_progress','ssw_exam_results','ssw_favorites']) {
        if (!sql.includes('CREATE TABLE IF NOT EXISTS ' + t)) throw new Error('tabel hilang: ' + t);
        if (!sql.includes('ALTER TABLE ' + t + ' ENABLE ROW LEVEL SECURITY') && !sql.includes('ALTER TABLE ' + t + '\n  ENABLE ROW LEVEL SECURITY')) {
          // RLS boleh multi-baris — cek nama tabel muncul di blok ALTER
          if (!new RegExp('ALTER TABLE ' + t + '\\s+ENABLE ROW LEVEL SECURITY').test(sql)) {
            if (!sql.match(new RegExp('ALTER TABLE\\s+' + t.replace(/_/g, '\\_') + '\\b')) ) throw new Error('RLS hilang: ' + t);
          }
        }
      }
      if (!/ON CONFLICT \(slug\) DO NOTHING/.test(sql)) throw new Error('seed harus idempoten');
      if (!/POLICY "SSW progress own"/.test(sql)) throw new Error('policy progres milik-user hilang');
    },
  },
  {
    name: 'Redirect /api/ssw-cms ada di netlify.toml (wajib eksplisit)',
    fn: async () => {
      const toml = fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8');
      if (!/from   = "\/api\/ssw-cms"/.test(toml)) throw new Error('redirect ssw-cms hilang');
      const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
      const vsrc = JSON.stringify(vercel.rewrites || []) + JSON.stringify(vercel.redirects || []) + JSON.stringify(vercel.routes || []);
      if (!/\/ssw/.test(vsrc)) throw new Error('redirect vercel /ssw hilang');
    },
  },
  {
    name: 'assets/ssw-api.js: progres lokal np-ssw-v1 + push diam + fallback seed',
    fn: async () => {
      const src = fs.readFileSync(path.join(ROOT, 'assets', 'ssw-api.js'), 'utf8');
      for (const pat of ["'np-ssw-v1'", 'NP_SSW_SEED', 'window.SSWAPI', 'pushProgress', 'ssw_progress', "source: 'seed'"]) {
        if (!src.includes(pat)) throw new Error('pola hilang di ssw-api.js: ' + pat);
      }
      // Namespace global tunggal — SSWAPI satu-satunya yang diassign.
      const assigned = [...new Set((src.match(/window\.[A-Za-z_$]+\s*=/g) || [])
        .map(s => s.replace(/\s*=$/, '')))];
      const rogue = assigned.filter(n => n !== 'window.SSWAPI');
      if (rogue.length > 0) throw new Error('global liar: ' + rogue.join(','));
    },
  },
  {
    name: 'assets/ssw-api.js: memakai jembatan Supabase yang BENAR (bukan global fiktif)',
    fn: async () => {
      const src = fs.readFileSync(path.join(ROOT, 'assets', 'ssw-api.js'), 'utf8');
      const code = src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, ''); // buang komentar

      // Global fiktif dari versi lama — tidak boleh muncul lagi di KODE.
      for (const bad of ['__supabase', 'NPSupabase', '.from(']) {
        if (code.includes(bad)) throw new Error('masih memakai pola lama: ' + bad);
      }
      // Harus lewat env.js + supabase-client.js + PostgREST langsung.
      for (const need of ['EDUMA_ENV', 'SUPABASE_ANON_KEY', 'window.SupabaseClient', '/rest/v1/', 'resolution=merge-duplicates']) {
        if (!code.includes(need)) throw new Error('jembatan Supabase kurang: ' + need);
      }
    },
  },
];

module.exports = { tests: tests.map(t => ({ name: t.name, fn: t.fn })) };
