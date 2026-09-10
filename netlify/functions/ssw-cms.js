/**
 * Netlify Function: /api/ssw-cms
 *
 * CRUD konten pembelajaran SSW (特定技能) — mengikuti pola PERSIS
 * jlpt-cms.js (v185) / blog-cms.js (v184): GET publik, POST/DELETE
 * wajib admin (JWT Supabase + role 'admin' di user_roles via service
 * key, bypass RLS, server-only), validasi struktur ketat sebelum simpan.
 *
 * Aksi (body.action atau query param untuk GET):
 *   GET   ?action=categories                daftar bidang (publik)
 *   GET   ?action=tree&field=kaigo          modul+lesson satu bidang (publik)
 *   GET   ?action=items&kind=vocabulary&field=kaigo   konten per bidang (publik)
 *   GET   ?action=quiz&id=<quiz_id>         quiz + questions (publik)
 *   GET   ?action=search&field=kaigo&q=移乗  pencarian vocab JP+ID (publik)
 *   POST  {action:'save', entity:'category'|'module'|'lesson'|'vocabulary'|'kanji'|
 *           'grammar'|'listening'|'reading'|'quiz', data:{...}}  — upsert admin
 *   POST  {action:'delete', entity, id}                          — admin
 *   GET   ?action=stats                     statistik konten (admin)
 *
 * Konten dibaca klien LANGSUNG dari Supabase (RLS published=true) untuk
 * halaman publik; endpoint ini untuk CMS admin + pencarian server-side.
 */

const { createClient } = require('@supabase/supabase-js');

const ALLOWED_ORIGINS = [
  'https://nihonggoproacademy.netlify.app',
  'http://localhost:8888',
  'http://localhost:3000',
];
function corsHeadersFor(event) {
  const reqOrigin = event.headers['origin'] || event.headers['Origin'] || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(reqOrigin) ? reqOrigin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  };
}

// Entity → tabel + validasi. Entity baru = tambah satu entri di sini,
// tanpa menyentuh alur handler.
const ENTITIES = {
  category:   { table: 'ssw_categories', slug: true },
  module:     { table: 'ssw_modules' },
  lesson:     { table: 'ssw_lessons', slug: true },
  vocabulary: { table: 'ssw_vocabulary' },
  kanji:      { table: 'ssw_kanji' },
  grammar:    { table: 'ssw_grammar' },
  listening:  { table: 'ssw_listening' },
  reading:    { table: 'ssw_reading' },
  quiz:       { table: 'ssw_quizzes' },
};

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function str(v, max = 20000) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}
function intOr(v, dflt) {
  const n = Number(v);
  return Number.isInteger(n) ? n : dflt;
}

// ── Validasi per entity — pesan dalam bahasa admin (Indonesia) ──
function validateEntity(entity, data, isUpdate) {
  const d = data || {};
  const need = (cond, msg) => (cond ? null : msg);
  switch (entity) {
    case 'category': {
      if (!isUpdate) {
        const e = need(d.slug && SLUG_RE.test(d.slug), 'slug wajib format kecil-kecil-angka (mis. kaigo, nougyou).') ||
                  need(str(d.name_jp, 100), 'name_jp wajib diisi (mis. 介護).') ||
                  need(str(d.name_id, 100), 'name_id wajib diisi (mis. Perawatan Lansia).');
        if (e) return e;
      }
      if (d.slug !== undefined && !SLUG_RE.test(String(d.slug))) return 'slug tidak valid.';
      return null;
    }
    case 'module': {
      return isUpdate ? null : need(d.category_id, 'category_id wajib — pilih bidang SSW-nya.') ||
        need(str(d.title, 200), 'Judul modul wajib diisi.');
    }
    case 'lesson': {
      if (!isUpdate) {
        const e = need(d.module_id, 'module_id wajib — pilih modul induknya.') ||
                  need(d.slug && SLUG_RE.test(d.slug), 'slug lesson wajib (mis. lesson-1).') ||
                  need(str(d.title, 200), 'Judul lesson wajib diisi.');
        if (e) return e;
      }
      return null;
    }
    case 'vocabulary': {
      return isUpdate ? null : need(d.category_id, 'category_id wajib.') ||
        need(str(d.term, 200), 'Kosakata (日本語) wajib diisi.') ||
        need(str(d.meaning_id, 500), 'Arti bahasa Indonesia wajib diisi.');
    }
    case 'kanji': {
      return isUpdate ? null : need(d.category_id, 'category_id wajib.') ||
        need(str(d.kanji, 4), 'Kanji wajib diisi.') ||
        need(str(d.meaning_id, 500), 'Arti bahasa Indonesia wajib diisi.');
    }
    case 'grammar': {
      return isUpdate ? null : need(d.category_id, 'category_id wajib.') ||
        need(str(d.pattern, 300), 'Pola grammar wajib diisi.') ||
        need(str(d.meaning_id, 500), 'Arti bahasa Indonesia wajib diisi.');
    }
    case 'listening': {
      return isUpdate ? null : need(d.category_id, 'category_id wajib.') ||
        need(str(d.title, 200), 'Judul wajib diisi.') ||
        need(str(d.audio_text, 20000), 'Teks audio wajib diisi — dibacakan lewat /api/tts.');
    }
    case 'reading': {
      return isUpdate ? null : need(d.category_id, 'category_id wajib.') ||
        need(str(d.title, 200), 'Judul wajib diisi.') ||
        need(str(d.text, 40000), 'Teks bacaan Jepang wajib diisi.');
    }
    case 'quiz': {
      if (!isUpdate) {
        const e = need(d.category_id, 'category_id wajib.') ||
                  need(str(d.title, 200), 'Judul quiz wajib diisi.');
        if (e) return e;
      }
      if (d.kind !== undefined && !['quiz', 'practice', 'mock'].includes(d.kind)) {
        return 'kind wajib salah satu: quiz, practice, mock.';
      }
      if (d.source !== undefined && !['practice', 'official'].includes(d.source)) {
        return 'source wajib salah satu: practice (Generated Practice) atau official (Officially sourced). Soal buatan admin WAJIB practice.';
      }
      if (entity === 'quiz' && !isUpdate && d.source === 'official' && (!d.source_url || !str(d.source_url, 500))) {
        return 'Quiz dengan source=official WAJIB mencantumkan source_url — jangan klaim resmi tanpa sumber.';
      }
      return null;
    }
    default:
      return 'Entity tidak dikenal: ' + entity;
  }
}

// ── Bersihkan payload sebelum masuk DB (anti kolom asing) ──
const ALLOWED_COLS = {
  ssw_categories: ['slug','name_jp','name_id','name_en','icon','type1_ok','type2_ok','description','sort','published'],
  ssw_modules:    ['category_id','title','title_jp','description','sort','published'],
  ssw_lessons:    ['module_id','slug','title','title_jp','description','body_md','vocab_ids','kanji_ids','grammar_ids','audio_text','video_url','dialogues','example_questions','notes','sort','published'],
  ssw_vocabulary: ['category_id','term','furigana','romaji','meaning_id','meaning_en','example','example_furigana','example_id','audio_text','tags','level','published'],
  ssw_kanji:      ['category_id','kanji','onyomi','kunyomi','furigana','meaning_id','examples','sentence','sentence_furigana','sentence_id','strokes','published'],
  ssw_grammar:    ['category_id','pattern','meaning_id','explanation','structure','examples','notes','published'],
  ssw_listening:  ['category_id','title','audio_text','transcript','transcript_furigana','translation_id','questions','published'],
  ssw_reading:    ['category_id','title','text','furigana_text','translation_id','vocab','questions','published'],
  ssw_quizzes:    ['category_id','lesson_id','kind','title','description','pass_score','time_limit_min','question_count','randomize','source','source_name','source_url','source_updated','published'],
};

function sanitize(entity, data) {
  const table = ENTITIES[entity].table;
  const out = {};
  for (const key of ALLOWED_COLS[table] || []) {
    if (data[key] === undefined) continue;
    let v = data[key];
    // Teks panjang dipotong defensif
    if (typeof v === 'string') v = v.trim().slice(0, key === 'body_md' || key === 'text' ? 40000 : 20000);
    // Boolean jadi boolean sungguhan
    if (key === 'published' || key === 'type1_ok' || key === 'type2_ok' || key === 'randomize') v = Boolean(v);
    out[key] = v;
  }
  return out;
}

async function verifyAdmin(authHeader, sbService) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, error: 'Token admin tidak ada.' };
  }
  try {
    const sbRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: { 'Authorization': authHeader, 'apikey': process.env.SUPABASE_ANON_KEY },
    });
    if (!sbRes.ok) return { ok: false, error: 'Token tidak valid.' };
    const user = await sbRes.json();
    const userId = user?.id;
    if (!userId) return { ok: false, error: 'Token tidak valid.' };
    const { data: roleRow } = await sbService.from('user_roles').select('role').eq('user_id', userId).single();
    if ((roleRow?.role || 'student') !== 'admin') {
      return { ok: false, error: 'Akun ini tidak memiliki akses admin.' };
    }
    return { ok: true, userId };
  } catch (e) {
    return { ok: false, error: 'Gagal memverifikasi token admin.' };
  }
}

function ok(CORS, body, code = 200) { return { statusCode: code, headers: CORS, body: JSON.stringify(body) }; }
function fail(CORS, code, error) { return { statusCode: code, headers: CORS, body: JSON.stringify({ error }) }; }

exports.handler = async (event) => {
  const CORS = corsHeadersFor(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY || !process.env.SUPABASE_ANON_KEY) {
    return fail(CORS, 503, 'CMS belum dikonfigurasi di server.');
  }
  const sbService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const params = event.queryStringParameters || {};

  // ── GET ──
  if (event.httpMethod === 'GET') {
    const action = params.action || 'categories';

    if (action === 'categories') {
      const { data, error } = await sbService.from('ssw_categories')
        .select('*').eq('published', true).order('sort');
      if (error) return fail(CORS, 500, 'Gagal memuat kategori SSW.');
      return ok(CORS, { categories: data || [] });
    }

    if (action === 'tree') {
      if (!params.field) return fail(CORS, 400, 'parameter field wajib (slug bidang).');
      const { data: cat, error: eCat } = await sbService.from('ssw_categories')
        .select('*').eq('slug', params.field).eq('published', true).single();
      if (eCat || !cat) return fail(CORS, 404, 'Bidang SSW tidak ditemukan: ' + params.field);
      const { data: modules } = await sbService.from('ssw_modules')
        .select('*, ssw_lessons(*)').eq('category_id', cat.id).eq('published', true)
        .order('sort').order('sort', { referencedTable: 'ssw_lessons' });
      const counts = {};
      for (const kind of ['vocabulary','kanji','grammar','listening','reading']) {
        const table = 'ssw_' + kind;
        const { count } = await sbService.from(table).select('id', { count: 'exact', head: true }).eq('category_id', cat.id);
        counts[kind] = count || 0;
      }
      const { count: quizCount } = await sbService.from('ssw_quizzes').select('id', { count: 'exact', head: true }).eq('category_id', cat.id);
      counts.quiz = quizCount || 0;
      return ok(CORS, { category: cat, modules: modules || [], counts });
    }

    if (action === 'items') {
      const kind = params.kind || '';
      const table = 'ssw_' + kind;
      if (!ENTITIES[Object.keys(ENTITIES).find(k => ENTITIES[k].table === table)] || kind === 'category' || kind === 'module' || kind === 'lesson' || kind === 'quiz') {
        // konten per bidang: vocabulary/kanji/grammar/listening/reading
      }
      if (!['vocabulary','kanji','grammar','listening','reading'].includes(kind)) {
        return fail(CORS, 400, 'kind tidak dikenal: ' + kind);
      }
      if (!params.field) return fail(CORS, 400, 'parameter field wajib.');
      const { data: cat } = await sbService.from('ssw_categories').select('id').eq('slug', params.field).single();
      if (!cat) return fail(CORS, 404, 'Bidang tidak ditemukan.');
      let q = sbService.from(table).select('*').eq('category_id', cat.id).eq('published', true);
      if (params.q) {
        // Pencarian sederhana JP+ID — ilike di beberapa kolom
        const like = `%${params.q}%`;
        const cols = kind === 'vocabulary' ? ['term','furigana','romaji','meaning_id'] :
                     kind === 'kanji' ? ['kanji','meaning_id'] :
                     kind === 'grammar' ? ['pattern','meaning_id'] : ['title'];
        q = q.or(cols.map(c => `${c}.ilike.${like}`).join(','));
      }
      const { data, error } = await q.limit(500);
      if (error) return fail(CORS, 500, 'Gagal memuat ' + kind + '.');
      return ok(CORS, { items: data || [] });
    }

    if (action === 'quiz') {
      if (!params.id) return fail(CORS, 400, 'parameter id wajib.');
      const { data: quiz, error } = await sbService.from('ssw_quizzes')
        .select('*, ssw_questions(*)').eq('id', params.id).eq('published', true).single();
      if (error || !quiz) return fail(CORS, 404, 'Quiz tidak ditemukan.');
      quiz.ssw_questions.sort((a, b) => (a.sort - b.sort));
      return ok(CORS, { quiz });
    }

    if (action === 'stats') {
      // Statistik konten — admin saja
      const auth = await verifyAdmin(event.headers['authorization'] || event.headers['Authorization'] || '', sbService);
      if (!auth.ok) return fail(CORS, 403, auth.error);
      const stats = {};
      for (const t of ['categories','modules','lessons','vocabulary','kanji','grammar','listening','reading','quizzes','questions']) {
        const { count } = await sbService.from('ssw_' + t).select('id', { count: 'exact', head: true });
        stats[t] = count || 0;
      }
      return ok(CORS, { stats });
    }

    return fail(CORS, 400, 'action GET tidak dikenal: ' + action);
  }

  // ── POST: wajib admin ──
  if (event.httpMethod === 'POST') {
    const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
    const auth = await verifyAdmin(authHeader, sbService);
    if (!auth.ok) return fail(CORS, 403, auth.error);

    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch (_) {
      return fail(CORS, 400, 'Invalid JSON');
    }
    const action = body.action;

    if (action === 'save') {
      const entity = body.entity;
      if (!ENTITIES[entity]) return fail(CORS, 400, 'entity tidak dikenal: ' + entity);
      const data = body.data || {};
      const isUpdate = Boolean(data.id);
      const vErr = validateEntity(entity, data, isUpdate);
      if (vErr) return fail(CORS, 400, vErr);

      const payload = sanitize(entity, data);
      if (Object.keys(payload).length === 0) return fail(CORS, 400, 'Tidak ada data untuk disimpan.');

      let query = sbService.from(ENTITIES[entity].table);
      let result;
      if (isUpdate) {
        result = await query.update({ ...payload, updated_at: new Date().toISOString() }).eq('id', data.id).select().single();
      } else {
        payload.created_by = auth.userId;
        result = await query.insert(payload).select().single();
      }
      if (result.error) {
        const msg = result.error.message || '';
        if (msg.includes('duplicate key')) return fail(CORS, 409, 'slug sudah dipakai di modul/bidang ini.');
        return fail(CORS, 500, 'Gagal menyimpan ' + entity + ': ' + msg.slice(0, 200));
      }
      return ok(CORS, { saved: result.data }, isUpdate ? 200 : 201);
    }

    if (action === 'save-question') {
      // Soal quiz: satu endpoint terpisah karena bentuk payload/answer per tipe
      const q = body.data || {};
      if (!q.quiz_id) return fail(CORS, 400, 'quiz_id wajib.');
      const TYPES = ['mc','tf','fill','match','vocab','kanji','grammar','listening','reading'];
      if (!TYPES.includes(q.type)) return fail(CORS, 400, 'type wajib salah satu: ' + TYPES.join(','));
      const payload = q.payload || {};
      const answer = q.answer || {};
      if (typeof payload.question !== 'string' || !payload.question.trim()) return fail(CORS, 400, 'payload.question wajib.');
      if (['mc','vocab','kanji','grammar','listening','reading'].includes(q.type)) {
        if (!Array.isArray(payload.choices) || payload.choices.length < 2 || payload.choices.length > 6) {
          return fail(CORS, 400, 'pilihan jawaban wajib 2-6 opsi untuk tipe pilihan ganda.');
        }
        if (!Number.isInteger(answer.index) || answer.index < 0 || answer.index >= payload.choices.length) {
          return fail(CORS, 400, 'answer.index tidak valid untuk tipe pilihan ganda.');
        }
      } else if (q.type === 'tf') {
        if (typeof answer.bool !== 'boolean') return fail(CORS, 400, 'answer.bool (true/false) wajib untuk tipe tf.');
      } else if (q.type === 'fill') {
        if (!Array.isArray(answer.accept) || answer.accept.length === 0) return fail(CORS, 400, 'answer.accept (daftar jawaban diterima) wajib untuk tipe fill.');
      } else if (q.type === 'match') {
        if (!Array.isArray(answer.pairs) || answer.pairs.length < 2) return fail(CORS, 400, 'answer.pairs wajib minimal 2 pasangan untuk tipe match.');
      }
      if (!q.explanation || !String(q.explanation).trim()) return fail(CORS, 400, 'Pembahasan wajib diisi — standar proyek ini.');

      const row = {
        quiz_id: q.quiz_id, type: q.type,
        payload: JSON.parse(JSON.stringify(payload)),
        answer: JSON.parse(JSON.stringify(answer)),
        explanation: String(q.explanation).trim().slice(0, 5000),
        points: intOr(q.points, 1),
        sort: intOr(q.sort, 100),
      };
      let result;
      if (q.id) result = await sbService.from('ssw_questions').update(row).eq('id', q.id).select().single();
      else result = await sbService.from('ssw_questions').insert(row).select().single();
      if (result.error) return fail(CORS, 500, 'Gagal menyimpan soal: ' + (result.error.message || '').slice(0, 200));
      return ok(CORS, { question: result.data }, q.id ? 200 : 201);
    }

    if (action === 'delete') {
      const entity = body.entity;
      if (!ENTITIES[entity]) return fail(CORS, 400, 'entity tidak dikenal: ' + entity);
      if (!body.id) return fail(CORS, 400, 'id wajib untuk delete.');
      const { error } = await sbService.from(ENTITIES[entity].table).delete().eq('id', body.id);
      if (error) return fail(CORS, 500, 'Gagal menghapus: ' + (error.message || '').slice(0, 200));
      return ok(CORS, { deleted: body.id });
    }

    return fail(CORS, 400, 'action POST tidak dikenal: ' + action);
  }

  return fail(CORS, 405, 'Method tidak didukung.');
};
