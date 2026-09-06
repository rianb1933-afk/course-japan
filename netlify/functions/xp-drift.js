/**
 * Netlify Function: /api/xp-drift
 * ───────────────────────────────────────────────────────────────────
 * Laporan drift XP untuk Admin-Dashboard: bandingkan user_progress.xp
 * (angka mutlak profil) dengan jumlah baris user_xp_log yang SUDAH
 * di-apply (xp_applied=true) — yaitu jumlah yang seharusnya menurut
 * jalur log-id yang tervalidasi server.
 *
 * KENAPA PERLU
 * Sejak Sync.push tidak lagi menimpa kolom xp (commit 6247017), satu-
 * satunya penulis user_progress.xp yang sah adalah apply_user_xp /
 * add_user_xp / backfill — semuanya bersumber dari user_xp_log. Drift
 * berarti salah satu dari: (a) XP lama pra-log dari era localStorage,
 * (b) baris log yang RPC-nya gagal dan belum ke backfill, atau
 * (c) penulisan manual di SQL Editor. Laporan ini membuat yang ketiga
 * terlihat, bukan hilang.
 *
 * AKSES: admin-only. Peran dibaca dari user_roles di server (service
 * key) setelah JWT diverifikasi ke Supabase — pola sama dengan
 * blog-cms.js / group-tokens.js. Email tidak pernah dikirim ke klien.
 *
 * ENV VARS: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
 */
const { createClient } = require('@supabase/supabase-js');

const ALLOWED_ORIGINS = [
  'https://nihongopro.id',
  'https://www.nihongopro.id',
  'http://localhost:8888',
  'http://localhost:3000',
];

function corsHeadersFor(event) {
  const reqOrigin = event.headers['origin'] || event.headers['Origin'] || '';
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(reqOrigin) ? reqOrigin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
}

/* Pola verifikasi sama dengan blog-cms.js verifyAdmin: JWT diverifikasi
   ke Supabase, peran dibaca dengan service key dari user_roles. */
async function verifyAdmin(authHeader, sbService) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, error: 'Token admin tidak ada.' };
  }
  try {
    const sbRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': authHeader,
        'apikey': process.env.SUPABASE_ANON_KEY,
      },
    });
    if (!sbRes.ok) return { ok: false, error: 'Token tidak valid.' };
    const user = await sbRes.json();
    const userId = user?.id;
    if (!userId) return { ok: false, error: 'Token tidak valid.' };

    const { data: roleRow } = await sbService
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();
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
  const json = (code, obj) => ({
    statusCode: code,
    headers: Object.assign({ 'Content-Type': 'application/json' }, CORS),
    body: JSON.stringify(obj),
  });

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY || !process.env.SUPABASE_ANON_KEY) {
    return json(501, {
      error: 'Laporan drift belum aktif: SUPABASE_URL, SUPABASE_ANON_KEY, dan SUPABASE_SERVICE_KEY '
           + 'harus diisi di Netlify (Site settings → Environment variables).',
      code: 'NOT_CONFIGURED',
    });
  }

  const sbService = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const auth = await verifyAdmin(event.headers['authorization'] || event.headers['Authorization'], sbService);
  if (!auth.ok) return json(403, { error: auth.error });

  try {
    /* Dua agregat dipanggil paralel, digabung di memori. Ukuran wajar:
       user_progress satu baris per pengguna; agregat log satu baris per
       pengguna yang pernah punya log. */
    const [progRes, logRes] = await Promise.all([
      sbService.from('user_progress').select('user_id, xp'),
      sbService.from('user_xp_log')
        .select('user_id, xp_earned')
        .eq('xp_applied', true),
    ]);
    if (progRes.error) throw progRes.error;
    if (logRes.error) throw logRes.error;

    const applied = new Map();
    for (const row of logRes.data || []) {
      applied.set(row.user_id, (applied.get(row.user_id) || 0) + (row.xp_earned || 0));
    }

    /* Semua pengguna yang punya profil ATAU log — drift hanya berarti jika
       salah satu sisinya ada. */
    const ids = new Set([
      ...(progRes.data || []).map(r => r.user_id),
      ...applied.keys(),
    ]);

    const users = [];
    for (const id of ids) {
      const prog = (progRes.data || []).find(r => r.user_id === id);
      const profileXp = prog ? (prog.xp || 0) : 0;
      const logXp = applied.get(id) || 0;
      const drift = profileXp - logXp;
      users.push({
        userId: id,
        profileXp,
        logXp,
        drift,
        hasLog: applied.has(id),
      });
    }
    // Paling jauh driftnya paling atas, nol paling bawah.
    users.sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift));

    const drifted = users.filter(u => u.drift !== 0);
    return json(200, {
      generatedAt: new Date().toISOString(),
      totalUsers: users.length,
      driftedCount: drifted.length,
      totalDrift: drifted.reduce((s, u) => s + u.drift, 0),
      users: users.slice(0, 200), // batas tampil; cukup untuk audit manual
    });
  } catch (err) {
    console.error('xp-drift error:', err);
    return json(500, { error: 'Terjadi kesalahan di server.' });
  }
};
