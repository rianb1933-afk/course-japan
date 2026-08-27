/**
 * Netlify Function: /api/jlpt-cms
 *
 * CRUD untuk jlpt_questions -- bukti konsep KEDUA sistem CMS (v185),
 * mengikuti pola PERSIS sama dengan blog-cms.js (v184): GET publik,
 * POST/DELETE wajib admin, validasi struktur ketat sebelum simpan.
 *
 * Soal LAMA (2.707 soal dari build_jlpt_question_bank.py, masih hidup
 * sebagai var Q=[...] inline di 150 halaman Materi/*.html) TIDAK disentuh
 * sama sekali -- endpoint ini HANYA untuk soal BARU yang ditulis admin
 * lewat CMS, additive terhadap yang sudah ada.
 *
 * KEAMANAN: pola sama persis blog-cms.js/admin-login.js (v179/v184) --
 * verifikasi JWT via Supabase Auth API, cek role di user_roles pakai
 * service key (bypass RLS, server-only).
 *
 * VALIDASI STRUKTUR: choices WAJIB tepat 4 opsi (sama seperti syarat yang
 * sudah ditegakkan scripts/build_jlpt_question_bank.py untuk 2.707 soal
 * lama), correct_index WAJIB 0-3, category dari daftar yang dikenal.
 */

const { createClient } = require('@supabase/supabase-js');

const ALLOWED_ORIGINS = [
  'https://nihonggopro.id',
  'https://www.nihonggopro.id',
  'http://localhost:8888',
  'http://localhost:3000',
];
function corsHeadersFor(event) {
  const reqOrigin = event.headers['origin'] || event.headers['Origin'] || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(reqOrigin) ? reqOrigin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  };
}

// Kategori yang dikenal proyek ini (dari build_jlpt_question_bank.py) --
// bukan validasi ketat menolak nilai lain (kategori baru mungkin muncul),
// tapi dipakai untuk pesan error yang membantu admin.
const KNOWN_CATEGORIES = ['grammar', 'vocabulary', 'kanji', 'conversation', 'listening', 'reading', 'expression', 'general'];
const KNOWN_JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

function validateQuestion(body) {
  const { question, choices, correct_index, explanation, category, jlpt_level, difficulty } = body;
  if (!question || typeof question !== 'string' || !question.trim()) {
    return 'Pertanyaan wajib diisi.';
  }
  if (question.length > 1000) return 'Pertanyaan terlalu panjang (maks 1000 karakter).';
  if (!Array.isArray(choices) || choices.length !== 4) {
    return 'Pilihan jawaban WAJIB tepat 4 opsi (konsisten dengan seluruh 2.707 soal existing).';
  }
  if (choices.some(c => typeof c !== 'string' || !c.trim())) {
    return 'Semua 4 pilihan jawaban wajib diisi teks non-kosong.';
  }
  if (!Number.isInteger(correct_index) || correct_index < 0 || correct_index > 3) {
    return 'correct_index wajib angka 0-3 (index pilihan yang benar).';
  }
  if (!explanation || typeof explanation !== 'string' || !explanation.trim()) {
    return 'Penjelasan wajib diisi (standar proyek ini: pembahasan mendalam, bukan hanya "karena benar").';
  }
  if (explanation.length < 20) {
    return 'Penjelasan terlalu pendek (minimal 20 karakter) -- standar kualitas proyek ini mensyaratkan pembahasan mengajar, bukan cuma jawaban singkat.';
  }
  if (jlpt_level && !KNOWN_JLPT_LEVELS.includes(jlpt_level)) {
    return `jlpt_level tidak dikenal. Gunakan salah satu: ${KNOWN_JLPT_LEVELS.join(', ')}.`;
  }
  if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
    return 'difficulty wajib salah satu: easy, medium, hard.';
  }
  return null;
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

exports.handler = async (event) => {
  const CORS = corsHeadersFor(event);
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY || !process.env.SUPABASE_ANON_KEY) {
    return { statusCode: 503, headers: CORS, body: JSON.stringify({ error: 'CMS belum dikonfigurasi di server.' }) };
  }
  const sbService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  // ── GET: list publik, filter opsional by category/jlpt_level ──
  if (event.httpMethod === 'GET') {
    const { category, jlpt_level, id } = event.queryStringParameters || {};
    let query = sbService.from('jlpt_questions').select('*').eq('published', true);
    if (id) {
      query = query.eq('id', id).single();
    } else {
      if (category) query = query.eq('category', category);
      if (jlpt_level) query = query.eq('jlpt_level', jlpt_level);
      query = query.order('created_at', { ascending: false }).limit(100);
    }
    const { data, error } = await query;
    if (error) {
      return { statusCode: 404, headers: CORS, body: JSON.stringify({ error: 'Soal tidak ditemukan.' }) };
    }
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ questions: Array.isArray(data) ? data : [data] }) };
  }

  // ── POST/DELETE wajib admin ──
  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || '';
  const auth = await verifyAdmin(authHeader, sbService);
  if (!auth.ok) {
    return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: auth.error }) };
  }

  if (event.httpMethod === 'POST') {
    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch (_) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }
    const validationError = validateQuestion(body);
    if (validationError) {
      return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: validationError }) };
    }

    const { question, choices, correct_index, explanation, category, jlpt_level, difficulty, tags } = body;
    const { data, error } = await sbService.from('jlpt_questions').insert({
      source_module: 'cms', // beda dari soal lama yang punya nama file HTML asli
      category: (category || 'general').trim(),
      question: question.trim(),
      choices,
      correct_index,
      explanation: explanation.trim(),
      difficulty: difficulty || 'medium',
      jlpt_level: jlpt_level || null,
      tags: Array.isArray(tags) ? tags.slice(0, 8) : [],
      created_by: auth.userId,
    }).select().single();

    if (error) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Gagal menyimpan soal.' }) };
    }
    return { statusCode: 201, headers: CORS, body: JSON.stringify({ question: data }) };
  }

  if (event.httpMethod === 'DELETE') {
    const id = event.queryStringParameters?.id;
    if (!id) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'id wajib disertakan.' }) };
    const { error } = await sbService.from('jlpt_questions').delete().eq('id', id);
    if (error) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Gagal menghapus soal.' }) };
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ deleted: id }) };
  }

  return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
};
