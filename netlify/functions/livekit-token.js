/**
 * Netlify Function: /api/livekit-token
 * Membuat access token JWT untuk peserta Live Classroom via LiveKit (SFU).
 *
 * Kenapa SFU? PeerJS mesh membuat tiap peserta upload video ke SEMUA peserta
 * lain — di 8 orang jadi 7 stream upload per orang. LiveKit (SFU) membuat tiap
 * peserta upload 1 stream ke server, server mendistribusikan. Skalabel ke
 * puluhan peserta.
 *
 * SETUP:
 *   1. Deploy LiveKit — LiveKit Cloud (cloud.livekit.io, gratis untuk mulai)
 *      atau self-host via Docker.
 *   2. Dari LiveKit dapatkan: API Key + API Secret + WS URL.
 *   3. Set env di Netlify:
 *        LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL (wss://xxx.livekit.cloud)
 *   4. npm install livekit-server-sdk (di package.json fungsi).
 *
 * KEAMANAN: API Secret RAHASIA — hanya di sini, tidak pernah ke frontend.
 * Frontend hanya menerima token JWT untuk room tertentu.
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
  // GENUINELY DIPERBAIKI (Fase HH, Audit Database): dikonfirmasi flag
  // `isHost` dari body request client GENUINELY TIDAK PERNAH diverifikasi
  // terhadap kepemilikan/otorisasi room yang nyata -- siapa pun yang
  // memanggil endpoint ini langsung (tanpa melalui UI mana pun, mengingat
  // genuinely 0 halaman di proyek ini yang memanggil endpoint ini saat
  // ini) genuinely BISA mengklaim `isHost: true` dan mendapat `roomAdmin`
  // (hak moderasi: mute/kick peserta lain) di room MANAPUN. Karena
  // genuinely belum ada mekanisme otorisasi kepemilikan room yang aman di
  // proyek ini (implementasi video call yang genuinely aktif, PeerJS mesh
  // di Kelas-Online.html, juga menentukan host secara client-side tanpa
  // verifikasi server), grant `roomAdmin` dinonaktifkan sepenuhnya untuk
  // mencegah eskalasi hak akses yang tidak sah -- lebih aman fitur
  // moderasi LiveKit belum berfungsi daripada memberi hak admin ke
  // sembarang pemanggil endpoint publik ini. Variabel `isHost` genuinely
  // tidak lagi dipakai untuk otorisasi, dihapus untuk kejelasan kode.

  if (!roomName || !identity) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'room dan identity wajib diisi' }) };
  }

  try {
    // Perlu: npm install livekit-server-sdk
    const { AccessToken } = require('livekit-server-sdk');

    const at = new AccessToken(apiKey, apiSecret, { identity, name: displayName });
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,       // boleh kirim kamera/mic
      canSubscribe: true,     // boleh terima peserta lain
      canPublishData: true,   // untuk chat/data channel
      roomAdmin: false,       // GENUINELY DINONAKTIFKAN: lihat komentar di atas -- isHost dari client tidak dapat dipercaya untuk hak moderasi tanpa verifikasi kepemilikan room server-side yang genuinely belum ada
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
