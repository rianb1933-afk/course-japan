/* Uji otorisasi di netlify/functions/livekit-token.js (Audit P1).
   ───────────────────────────────────────────────────────────────────
   Sebelum perbaikan, endpoint ini menerbitkan token LiveKit dengan
   canPublish/canSubscribe/canPublishData true untuk SIAPA PUN yang
   mengirim room+identity — authToken hanya memengaruhi roomAdmin
   (moderasi). Digabung dengan live_rooms yang publicly readable, siapa
   pun bisa menemukan room_code dan bergabung sebagai partisipan penuh
   tanpa pernah login. Yang dijaga di sini: TIDAK ADA token yang
   diterbitkan tanpa authToken yang lolos verifikasi Supabase Auth.

   Tidak menyentuh Supabase/LiveKit sungguhan: global.fetch disadap untuk
   /auth/v1/user dan /rest/v1/live_rooms; livekit-server-sdk terpasang asli
   di node_modules (AccessToken.toJwt() murni penandatanganan lokal, tidak
   perlu jaringan) sehingga token yang dikembalikan bisa didekode dan
   grant `video`-nya diperiksa langsung. */
'use strict';
const assert = require('assert');
const path = require('path');

const FN = path.join(__dirname, '..', '..', 'netlify', 'functions', 'livekit-token.js');

function ev(body) {
  return { httpMethod: 'POST', headers: {}, body: JSON.stringify(body || {}) };
}

function decodeVideoGrant(jwt) {
  const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString('utf8'));
  return payload.video || {};
}

/* authResponder(authToken) -> {ok, id} untuk /auth/v1/user.
   hostMatch: true bila /rest/v1/live_rooms harus mengembalikan baris (host cocok). */
function withMocks(authResponder, hostMatch, fn) {
  const realFetch = global.fetch;
  global.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes('/auth/v1/user')) {
      const authHeader = (opts.headers || {}).Authorization || '';
      const token = authHeader.replace(/^Bearer /, '');
      const res = authResponder(token);
      return { ok: res.ok, json: async () => (res.ok ? { id: res.id } : {}) };
    }
    if (u.includes('/rest/v1/live_rooms')) {
      return { ok: true, json: async () => (hostMatch ? [{ room_code: 'R1' }] : []) };
    }
    throw new Error('fetch tak terduga: ' + u);
  };
  const savedEnv = {};
  const envs = {
    LIVEKIT_API_KEY: 'key', LIVEKIT_API_SECRET: 'secretsecretsecretsecret1234', LIVEKIT_URL: 'wss://x.livekit.cloud',
    SUPABASE_URL: 'https://example.invalid', SUPABASE_ANON_KEY: 'anon-key', SUPABASE_SERVICE_KEY: 'service-key',
  };
  Object.entries(envs).forEach(([k, v]) => { savedEnv[k] = process.env[k]; process.env[k] = v; });
  delete require.cache[require.resolve(FN)];
  const handler = require(FN).handler;
  return Promise.resolve(fn(handler)).finally(() => {
    global.fetch = realFetch;
    Object.entries(savedEnv).forEach(([k, v]) => {
      if (v === undefined) delete process.env[k]; else process.env[k] = v;
    });
  });
}

const tests = [
  {
    name: 'Tanpa authToken sama sekali → 401, tidak ada token LiveKit diterbitkan',
    fn: () => withMocks(() => ({ ok: false }), false, async (handler) => {
      const res = await handler(ev({ room: 'R1', identity: 'u1' }));
      assert.strictEqual(res.statusCode, 401);
      assert.ok(!JSON.parse(res.body).token, 'tidak boleh ada token di respons');
    }),
  },
  {
    name: 'authToken tidak valid (Supabase Auth menolak) → 401',
    fn: () => withMocks(() => ({ ok: false }), false, async (handler) => {
      const res = await handler(ev({ room: 'R1', identity: 'u1', authToken: 'token-palsu' }));
      assert.strictEqual(res.statusCode, 401);
      assert.ok(!JSON.parse(res.body).token);
    }),
  },
  {
    name: 'SUPABASE_URL/ANON_KEY belum dikonfigurasi → 503, gagal tertutup (bukan lolos tanpa cek)',
    fn: () => withMocks(() => ({ ok: true, id: 'u1' }), false, async (handler) => {
      delete process.env.SUPABASE_URL;
      const res = await handler(ev({ room: 'R1', identity: 'u1', authToken: 't' }));
      assert.strictEqual(res.statusCode, 503);
    }),
  },
  {
    name: 'authToken valid tapi bukan host → 200, token diterbitkan TANPA roomAdmin',
    fn: () => withMocks((tok) => ({ ok: tok === 'jwt-siswa', id: 'u-siswa' }), false, async (handler) => {
      const res = await handler(ev({ room: 'R1', identity: 'u-siswa', authToken: 'jwt-siswa' }));
      assert.strictEqual(res.statusCode, 200);
      const { token } = JSON.parse(res.body);
      const grant = decodeVideoGrant(token);
      assert.strictEqual(grant.canPublish, true, 'partisipan biasa tetap boleh publish kamera/mic');
      assert.strictEqual(grant.roomAdmin, false, 'bukan host tidak boleh dapat roomAdmin');
    }),
  },
  {
    name: 'authToken valid + host_id cocok di live_rooms → 200, token dengan roomAdmin: true',
    fn: () => withMocks((tok) => ({ ok: tok === 'jwt-host', id: 'u-host' }), true, async (handler) => {
      const res = await handler(ev({ room: 'R1', identity: 'u-host', authToken: 'jwt-host' }));
      assert.strictEqual(res.statusCode, 200);
      const { token } = JSON.parse(res.body);
      const grant = decodeVideoGrant(token);
      assert.strictEqual(grant.roomAdmin, true, 'host terverifikasi harus dapat roomAdmin');
    }),
  },
  {
    name: 'room/identity kosong → 400 walau authToken ada (validasi input tetap jalan)',
    fn: () => withMocks(() => ({ ok: true, id: 'u1' }), false, async (handler) => {
      const res = await handler(ev({ room: '', identity: '', authToken: 'jwt-host' }));
      assert.strictEqual(res.statusCode, 400);
    }),
  },
];

module.exports = { tests };
