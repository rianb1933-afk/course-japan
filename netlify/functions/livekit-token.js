/**
 * Netlify Function: /api/livekit-token
 * Membuat access token JWT untuk peserta Live Classroom via LiveKit (SFU).
 *
 * KEAMANAN: roomAdmin hanya diberikan jika host terverifikasi via Supabase JWT.
 * Verifikasi dilakukan server-side: JWT → Supabase Auth → live_rooms.host_id.
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
const ALLOWED_ORIGINS = ['https://nihongopro.id', 'https://www.nihongopro.id', 'http://localhost:8888', 'http://localhost:3000'];
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

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (e) { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Body tidak valid' }) }; }

  const roomName = String(body.room || '').trim().slice(0, 64);
  const identity = String(body.identity || '').trim().slice(0, 64);
  const displayName = String(body.name || identity).slice(0, 40);

  if (!roomName || !identity) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'room dan identity wajib diisi' }) };
  }

  // ── ROOM OWNERSHIP VERIFICATION ─────────────────────────────────────────
  // Client mengirim `authToken` (Supabase JWT). Server verifikasi JWT via
  // Supabase Auth REST API, lalu cek apakah user_id = host_id di live_rooms.
  // Hanya host terverifikasi yang mendapat roomAdmin: true (moderasi LiveKit).
  let isVerifiedHost = false;
  const authToken = String(body.authToken || '').trim();
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

  if (authToken && supabaseUrl && supabaseKey) {
    try {
      const authRes = await fetch(supabaseUrl + '/auth/v1/user', {
        headers: { Authorization: 'Bearer ' + authToken },
      });
      if (authRes.ok) {
        const userData = await authRes.json();
        const userId = userData.id;
        if (userId) {
          const roomRes = await fetch(
            supabaseUrl + '/rest/v1/live_rooms?room_code=eq.' + encodeURIComponent(roomName) + '&host_id=eq.' + userId + '&select=room_code',
            { headers: { apikey: supabaseKey, Authorization: 'Bearer ' + supabaseKey } }
          );
          if (roomRes.ok) {
            const rows = await roomRes.json();
            isVerifiedHost = Array.isArray(rows) && rows.length > 0;
          }
        }
      }
    } catch (e) {
      // Verification failed — safe fallback: non-host
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
