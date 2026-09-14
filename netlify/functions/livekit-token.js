/**
 * Netlify Function: /api/livekit-token
 * Membuat access token JWT untuk peserta Live Classroom via LiveKit (SFU).
 *
 * KEAMANAN:
 *   - WAJIB LOGIN untuk bergabung sama sekali (Audit P1): sebelumnya endpoint
 *     ini menerbitkan token dengan canPublish/canSubscribe/canPublishData
 *     true untuk SIAPA PUN yang mengirim room+identity, tanpa autentikasi
 *     apa pun — hanya roomAdmin (moderasi) yang digerbangi JWT. Digabung
 *     dengan live_rooms yang memang publicly readable (lihat kolom komentar
 *     RLS-nya), room_code bisa ditemukan siapa saja lewat REST Supabase, jadi
 *     siapa pun bisa "zoom-bombing" kelas manapun tanpa pernah login. Sekarang
 *     authToken (JWT Supabase) wajib dan diverifikasi lebih dulu — TIDAK ada
 *     token LiveKit yang diterbitkan tanpa sesi valid.
 *   - roomAdmin tetap hanya diberikan jika host terverifikasi via Supabase JWT.
 *     Verifikasi dilakukan server-side: JWT → Supabase Auth → live_rooms.host_id.
 *
 * SETUP:
 *   1. Deploy LiveKit — LiveKit Cloud (cloud.livekit.io, gratis untuk mulai)
 *      atau self-host via Docker.
 *   2. Dari LiveKit dapatkan: API Key + API Secret + WS URL.
 *   3. Set env di Netlify:
 *        LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL (wss://xxx.livekit.cloud)
 *        SUPABASE_URL, SUPABASE_SERVICE_KEY (atau SUPABASE_KEY)
 *   4. npm install livekit-server-sdk (di package.json fungsi).
 */

// ── ORIGIN VALIDATION ────────────────────────────────────────────────
const ALLOWED_ORIGINS = ['https://nihonggoproacademy.netlify.app', 'http://localhost:8888', 'http://localhost:3000'];
function corsHeadersFor(event) {
  const reqOrigin = event.headers['origin'] || event.headers['Origin'] || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(reqOrigin) ? reqOrigin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  };
}

exports.handler = async (event) => {
  const headers = corsHeadersFor(event);

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !wsUrl) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error: 'Live Classroom SFU belum dikonfigurasi. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL di Netlify.',
      }),
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
  // Wajib bisa memverifikasi JWT (anon key) sebelum menerbitkan token apa pun —
  // tanpa ini tidak ada cara memastikan pemanggil benar-benar sudah login.
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: 'Live Classroom belum dikonfigurasi (SUPABASE_URL/SUPABASE_ANON_KEY belum di-set).' }),
    };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body tidak valid' }) }; }

  const roomName = String(body.room || '').trim().slice(0, 64);
  const identity = String(body.identity || '').trim().slice(0, 64);
  const displayName = String(body.name || identity).slice(0, 40);

  if (!roomName || !identity) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'room dan identity wajib diisi' }) };
  }

  // ── WAJIB LOGIN: verifikasi JWT dulu — TIDAK ADA token LiveKit tanpa ini ──
  const authToken = String(body.authToken || '').trim();
  if (!authToken) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Silakan masuk terlebih dahulu untuk bergabung ke kelas live.' }) };
  }

  let userId = null;
  try {
    const authRes = await fetch(supabaseUrl + '/auth/v1/user', {
      headers: { Authorization: 'Bearer ' + authToken, apikey: supabaseAnonKey },
    });
    if (!authRes.ok) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Sesi tidak valid, silakan masuk lagi.' }) };
    }
    const userData = await authRes.json();
    userId = userData.id || null;
    if (!userId) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Sesi tidak valid, silakan masuk lagi.' }) };
    }
  } catch (e) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'Gagal menghubungi server autentikasi.' }) };
  }

  // ── ROOM OWNERSHIP VERIFICATION ─────────────────────────────────────────
  // userId di atas sudah terverifikasi lewat JWT. Di sini hanya menentukan
  // apakah dia HOST room ini (host_id cocok) → roomAdmin: true (moderasi
  // LiveKit). Bukan host tetap boleh bergabung sebagai partisipan biasa.
  let isVerifiedHost = false;
  if (supabaseServiceKey) {
    try {
      const roomRes = await fetch(
        supabaseUrl + '/rest/v1/live_rooms?room_code=eq.' + encodeURIComponent(roomName) + '&host_id=eq.' + encodeURIComponent(userId) + '&select=room_code',
        { headers: { apikey: supabaseServiceKey, Authorization: 'Bearer ' + supabaseServiceKey } }
      );
      if (roomRes.ok) {
        const rows = await roomRes.json();
        isVerifiedHost = Array.isArray(rows) && rows.length > 0;
      }
    } catch (e) {
      // Verifikasi kepemilikan gagal — fallback aman: anggap bukan host.
      console.warn('[livekit-token] Room ownership verification failed:', e.message);
    }
  }

  try {
    const { AccessToken } = require('livekit-server-sdk');

    const at = new AccessToken(apiKey, apiSecret, { identity, name: displayName });
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,       // boleh kirim kamera/mic
      canSubscribe: true,     // boleh terima peserta lain
      canPublishData: true,   // untuk chat/data channel
      roomAdmin: isVerifiedHost,  // HANYA true jika JWT terverifikasi + host_id cocok
    });

    const token = await at.toJwt();
    return { statusCode: 200, headers, body: JSON.stringify({ token, url: wsUrl, room: roomName }) };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Gagal membuat token. Pastikan `livekit-server-sdk` terpasang.',
        detail: String(err.message || err),
      }),
    };
  }
};
