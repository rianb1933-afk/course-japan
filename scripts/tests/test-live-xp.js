/**
 * Test suite: DB.recordLiveXP di assets/supabase-client.js.
 * ──────────────────────────────────────────────────────────────
 * Alur XP kelas live yang baru: sisip log dulu (dengan Prefer return=representation
 * supaya id barisnya kembali), lalu panggil RPC apply_user_xp yang membaca jumlah
 * XP dari baris log itu sendiri -- bukan dari argumen klien. Yang dijaga di sini:
 * urutan panggilan, bentuk header/body, dan perilaku bila id tidak kembali.
 *
 * Tanpa jaringan sungguhan: fetch disadap, EDUMA_ENV di-set sebelum modul dimuat.
 */
'use strict';
const assert = require('assert');
const path = require('path');

const MOD = path.join(__dirname, '..', '..', 'assets', 'supabase-client.js');

/** Muat modul bersih dengan fetch tiruan; kembalikan { client, calls }.
    Modul dieksekusi sebagai IIFE(window) -- sediakan window minimal di Node. */
function loadClient(fetchImpl) {
  const realFetch = global.fetch;
  global.fetch = fetchImpl;
  const hadWindow = 'window' in global;
  const prevWindow = global.window;
  if (!hadWindow) {
    // addEventListener/document.addEventListener dipakai modul saat load.
    const stubEl = { addEventListener() {} };
    global.window = Object.assign(Object.create(global), {
      addEventListener() {}, document: stubEl,
    });
    global.document = stubEl;
  }
  delete require.cache[require.resolve(MOD)];
  require(MOD); // IIFE: meng-attach ke window sebagai window.SupabaseClient
  const client = global.window.SupabaseClient;
  assert.ok(client && client.DB, 'modul harus memasang window.SupabaseClient.DB');
  return { client, restore: () => {
    global.fetch = realFetch;
    if (hadWindow) global.window = prevWindow;
    else { delete global.window; delete global.document; }
  } };
}

const withEnv = (fn) => {
  const had = 'EDUMA_ENV' in global;
  const prev = global.EDUMA_ENV;
  global.EDUMA_ENV = { SUPABASE_URL: 'https://sb.example.com', SUPABASE_ANON_KEY: 'anon-key-test' };
  return Promise.resolve(fn()).finally(() => {
    if (had) global.EDUMA_ENV = prev; else delete global.EDUMA_ENV;
  });
};

const okJson = (body) => ({ ok: true, status: 200,
  headers: { get: (k) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
  json: async () => body });

const tests = [
  {
    name: 'tanpa konfigurasi Supabase: recordLiveXP no-op, tidak melempar',
    fn: () => withEnv(async () => {
      const saved = global.EDUMA_ENV;
      global.EDUMA_ENV = {}; // URL kosong
      let called = 0;
      const { client, restore } = loadClient(async () => { called++; return okJson([]); });
      try {
        await client.DB.recordLiveXP('u1', 50, { quiz: 2 });
        assert.strictEqual(called, 0, 'fetch tidak boleh dipanggil tanpa URL');
      } finally { global.EDUMA_ENV = saved; restore(); }
    }),
  },
  {
    name: 'tanpa userId: no-op',
    fn: () => withEnv(async () => {
      let called = 0;
      const { client, restore } = loadClient(async () => { called++; return okJson([]); });
      try {
        await client.DB.recordLiveXP(null, 50, {});
        assert.strictEqual(called, 0, 'fetch tidak boleh dipanggil tanpa userId');
      } finally { restore(); }
    }),
  },
  {
    name: 'urutan & bentuk: POST log dulu (return=representation), lalu RPC apply_user_xp dengan id log',
    fn: () => withEnv(async () => {
      const calls = [];
      const { client, restore } = loadClient(async (url, opts = {}) => {
        calls.push({ url: String(url), method: opts.method || 'GET', headers: opts.headers || {},
                     body: opts.body ? JSON.parse(opts.body) : null });
        // Panggilan pertama = INSERT log, kembalikan id-nya.
        if (calls.length === 1) return okJson([{ id: 42 }]);
        return okJson(null);
      });
      try {
        const r = await client.DB.recordLiveXP('user-abc', 75, { n: 1 });
        assert.strictEqual(r.ok, true);
        assert.strictEqual(calls.length, 2, 'harus tepat dua panggilan jaringan');
        // 1) INSERT user_xp_log
        assert.ok(calls[0].url.includes('/rest/v1/user_xp_log'), 'panggilan 1 ke user_xp_log');
        assert.strictEqual(calls[0].method, 'POST');
        assert.ok(String(calls[0].headers.Prefer || '').includes('return=representation'),
          'butuh Prefer return=representation supaya id baris kembali');
        assert.strictEqual(calls[0].body.user_id, 'user-abc');
        assert.strictEqual(calls[0].body.xp_earned, 75);
        assert.strictEqual(calls[0].body.source, 'live_session');
        // 2) RPC apply_user_xp -- id log dari respons, BUKAN jumlah XP sebagai argumen
        assert.ok(calls[1].url.includes('/rest/v1/rpc/apply_user_xp'), 'panggilan 2 ke RPC apply_user_xp');
        assert.strictEqual(calls[1].body.p_log_id, 42);
        assert.strictEqual(calls[1].body.p_user, 'user-abc');
        assert.strictEqual(calls[1].body.xp_earned, undefined,
          'jumlah XP tidak boleh dikirim sebagai argumen RPC');
      } finally { restore(); }
    }),
  },
  {
    name: 'id log tidak kembali (array kosong): XP tetap masuk lewat add_user_xp, backfill tidak akan dobel',
    fn: () => withEnv(async () => {
      const calls = [];
      const { client, restore } = loadClient(async (url, opts = {}) => {
        calls.push({ url: String(url), body: opts.body ? JSON.parse(opts.body) : null });
        return okJson([]); // INSERT tanpa representation -> kosong
      });
      try {
        const r = await client.DB.recordLiveXP('user-abc', 30, {});
        assert.strictEqual(r.ok, true);
        assert.strictEqual(calls.length, 2, 'fallback tetap dua langkah');
        assert.ok(calls[1].url.includes('/rest/v1/rpc/add_user_xp'), 'fallback ke add_user_xp');
        assert.strictEqual(calls[1].body.uid, 'user-abc');
        assert.strictEqual(calls[1].body.amount, 30);
      } finally { restore(); }
    }),
  },
  {
    name: 'gagal INSERT: error dilempar ke pemanggil (tidak ditelan diam-diam)',
    fn: () => withEnv(async () => {
      const { client, restore } = loadClient(async () => ({
        ok: false, status: 403,
        headers: { get: () => 'application/json' },
        json: async () => ({ message: 'new row violates row-level security policy' }),
      }));
      try {
        await assert.rejects(
          () => client.DB.recordLiveXP('user-abc', 10, {}),
          /row-level security|HTTP 403/
        );
      } finally { restore(); }
    }),
  },
  {
    name: 'RPC gagal setelah log tersimpan: OK untuk pemanggil -- backfill akan mengambil barisnya',
    fn: () => withEnv(async () => {
      let n = 0;
      const { client, restore } = loadClient(async () => {
        n++;
        if (n === 1) return okJson([{ id: 7 }]);
        return { ok: false, status: 500,
          headers: { get: () => 'application/json' },
          json: async () => ({ message: 'boom' }) };
      });
      try {
        const r = await client.DB.recordLiveXP('user-abc', 20, {});
        assert.strictEqual(r.ok, true, 'log tersimpan = janji bagi backfill');
        assert.strictEqual(r.logId, 7);
      } finally { restore(); }
    }),
  },
  // ── recordXP generik (semua sumber) ──────────────────────────────────
  {
    name: 'recordXP meneruskan sumber sah ke kolom source; sesi live tetap bekerja lewat wrapper',
    fn: () => withEnv(async () => {
      const calls = [];
      const { client, restore } = loadClient(async (url, opts = {}) => {
        calls.push({ url: String(url), body: opts.body ? JSON.parse(opts.body) : null });
        if (calls.length === 1) return okJson([{ id: 9 }]);
        return okJson(null);
      });
      try {
        // kanji lewat recordXP langsung
        const r = await client.DB.recordXP('u1', 20, 'kanji', { char: '採' });
        assert.strictEqual(r.ok, true);
        assert.strictEqual(calls[0].body.source, 'kanji');
        assert.strictEqual(calls[0].body.xp_earned, 20);
        assert.deepStrictEqual(calls[0].body.session_data, { char: '採' });
        // live_session lewat wrapper kompatibilitas
        await client.DB.recordLiveXP('u1', 50, { quiz: 2 });
        assert.strictEqual(calls[2].body.source, 'live_session');
        assert.strictEqual(calls[2].body.xp_earned, 50);
      } finally { restore(); }
    }),
  },
  {
    name: 'sumber di luar whitelist: XP TIDAK dikirim (log tanpa apply selamanya adalah sampah)',
    fn: () => withEnv(async () => {
      let called = 0;
      const warns = [];
      const realWarn = console.warn;
      console.warn = (...a) => warns.push(a.join(' '));
      const { client, restore } = loadClient(async () => { called++; return okJson([]); });
      try {
        const r = await client.DB.recordXP('u1', 99, 'cheat_source');
        assert.strictEqual(r.ok, false, 'harus ditolak dengan ok:false');
        assert.strictEqual(r.skipped, true);
        assert.strictEqual(called, 0, 'fetch tidak boleh dipanggil untuk sumber ilegal');
        assert.ok(warns.some(w => w.includes('cheat_source')), 'harus memberi peringatan sumber tak sah');
      } finally { console.warn = realWarn; restore(); }
    }),
  },
];

module.exports = { tests };
