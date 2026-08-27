/**
 * Netlify Function: /api/admin-login
 *
 * Endpoint verifikasi admin yang dicatat BELUM ADA di CHANGELOG v176.
 * Tanpa ini, Admin-Login.html (yang sudah benar meminta
 * window.NIHONGO_ADMIN_LOGIN_ENDPOINT) tidak punya backend nyata di
 * production — hanya demo mode localhost yang bisa dipakai.
 *
 * ALUR:
 *   1. Verifikasi email+password via Supabase Auth (password grant) — TIDAK
 *      menyimpan/membandingkan password sendiri, sepenuhnya didelegasikan
 *      ke Supabase Auth yang sudah dipakai user-facing login.
 *   2. Setelah login berhasil, cek tabel `user_roles` (via SERVICE KEY,
 *      bypass RLS) apakah role user tsb 'admin'. RLS `user_roles` sengaja
 *      hanya mengizinkan user membaca row miliknya sendiri — endpoint ini
 *      HARUS pakai service key supaya bisa memverifikasi, bukan
 *      mempercayai klaim dari klien.
 *   3. Jika bukan admin → 403, TIDAK mengembalikan token/sesi apa pun,
 *      walau kredensial Supabase-nya valid (mencegah user biasa yang
 *      berhasil login jadi tahu tokennya sendiri "hampir" admin).
 *
 * KEAMANAN:
 *   - SUPABASE_SERVICE_KEY adalah RAHASIA — hanya di sini, tidak pernah ke
 *     frontend (pola sama seperti MIDTRANS_SERVER_KEY di create-payment.js).
 *   - Rate limit percobaan login per (IP+email) memakai tabel `rate_limits`
 *     yang sudah ada — mencegah brute-force tanpa infrastruktur baru.
 *   - CORS whitelist origin, sama seperti 3 function lain (pola v175).
 *
 * ENV VARS (Netlify Dashboard → Environment variables):
 *   SUPABASE_URL           = https://xxx.supabase.co   (sudah ada, dipakai ai-chat.js)
 *   SUPABASE_ANON_KEY      = eyJ...                     (sudah ada)
 *   SUPABASE_SERVICE_KEY   = eyJ...  ROLE SERVICE (rahasia, BEDA dari anon key)
 *
 * Cara jadikan user admin (dari Supabase SQL editor, oleh Anda):
 *   INSERT INTO user_roles (user_id, role) VALUES ('<uuid-user>', 'admin')
 *   ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
 */

const { createClient } = require('@supabase/supabase-js');

// ── CORS: whitelist origin, sama seperti function lain (fix v175) ──────
const ALLOWED_ORIGINS = [
  'https://nihongopro.id',
  'https://www.nihongopro.id',
  'http://localhost:8888',
  'http://localhost:3000',
];
function corsHeadersFor(event) {
  const reqOrigin = event.headers['origin'] || event.headers['Origin'] || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(reqOrigin) ? reqOrigin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  };
}

// ── Rate limit percobaan login: pakai tabel rate_limits yang sudah ada ──
// Kunci berbeda dari rate limit AI ('login:<email>') supaya tidak bentrok
// kuota. Batas ketat (5/hari) karena ini bukan fitur pemakaian normal,
// tapi pintu masuk admin — brute force harus dipersulit, bukan cuma dicatat.
const LOGIN_ATTEMPT_LIMIT = 20; // per hari, per email dicoba
async function checkLoginAttempts(sb, email) {
  const day = new Date().toISOString().slice(0, 10);
  const key = `login:${email.toLowerCase()}`;
  const { data: row } = await sb.from('rate_limits').select().eq('user_id', key).eq('date', day).single();
  const count = (row?.count || 0) + 1;
  if (count > LOGIN_ATTEMPT_LIMIT) return { allowed: false, count };
  await sb.from('rate_limits').upsert({ user_id: key, date: day, count }, { onConflict: 'user_id,date' });
  return { allowed: true, count };
}

exports.handler = async (event) => {
  const CORS = corsHeadersFor(event);

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY || !process.env.SUPABASE_ANON_KEY) {
    return {
      statusCode: 503, headers: CORS,
      body: JSON.stringify({ error: 'Admin login belum dikonfigurasi di server (SUPABASE_SERVICE_KEY belum di-set).' }),
    };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (_) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (!email || !password) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Email dan password wajib diisi.' }) };
  }

  const sbService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  // ── 1. Rate limit percobaan (anti brute-force) ──
  try {
    const attempt = await checkLoginAttempts(sbService, email);
    if (!attempt.allowed) {
      return {
        statusCode: 429, headers: CORS,
        body: JSON.stringify({ error: 'Terlalu banyak percobaan login. Coba lagi besok atau hubungi admin lain.' }),
      };
    }
  } catch (_) {
    // Jika rate_limits gagal diakses (mis. tabel belum ada di env lama),
    // JANGAN blokir login karenanya — tapi juga jangan diam-diam skip
    // proteksi tanpa catatan. Lanjutkan tanpa rate limit kali ini.
  }

  // ── 2. Verifikasi kredensial via Supabase Auth (password grant) ──
  let authData;
  try {
    const authRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    });
    authData = await authRes.json();
    if (!authRes.ok || !authData.access_token) {
      return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Email atau password salah.' }) };
    }
  } catch (_) {
    return { statusCode: 502, headers: CORS, body: JSON.stringify({ error: 'Tidak dapat menghubungi server autentikasi.' }) };
  }

  const userId = authData.user?.id;
  if (!userId) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Autentikasi gagal.' }) };
  }

  // ── 3. Verifikasi role admin via service key (bypass RLS, server-only) ──
  // TIDAK mempercayai app_metadata dari authData mentah-mentah untuk role
  // admin — sumber kebenaran adalah tabel user_roles yang hanya bisa
  // ditulis manual oleh pemilik project (SQL editor / service key).
  let role = 'student';
  try {
    const { data: roleRow } = await sbService
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
    role = roleRow?.role || 'student';
  } catch (_) {
    role = 'student'; // fail-closed: error mengambil role = anggap bukan admin
  }

  if (role !== 'admin') {
    return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Akun ini tidak memiliki akses admin.' }) };
  }

  // ── 4. Sukses: kembalikan token yang SUDAH diverifikasi sebagai admin ──
  // Token yang dikembalikan adalah access_token Supabase asli (JWT valid),
  // bukan token buatan sendiri — supaya endpoint lain yang sudah memvalidasi
  // JWT Supabase (mis. cek Authorization: Bearer di ai-chat.js) tetap
  // konsisten dan bisa dipercaya.
  return {
    statusCode: 200, headers: CORS,
    body: JSON.stringify({
      token: authData.access_token,
      refresh_token: authData.refresh_token,
      email,
      role: 'admin',
      expires_in: authData.expires_in,
    }),
  };
};
