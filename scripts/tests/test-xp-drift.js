/**
 * Test suite: netlify/functions/xp-drift.js
 * ────────────────────────────────────────────────────────────────
 * Laporan drift XP harus admin-only dan perhitungannya benar:
 *   drift = user_progress.xp − SUM(user_xp_log.xp_earned WHERE xp_applied)
 *
 * Tanpa jaringan sungguhan: @supabase/supabase-js dan fetch global
 * ditiru. Yang dijaga: gerbang auth (403), konfigurasi (501), metode
 * (405), penggabungan dua agregat, urutan drift terbesar, dan tidak
 * ada email yang bocor ke respons.
 */
'use strict';
const assert = require('assert');
const path = require('path');

const MOD = path.join(__dirname, '..', '..', 'netlify', 'functions', 'xp-drift.js');

/** Muat modul dengan semua dependensi eksternal ditiru. */
function load(impl) {
  const calls = { from: [], verifyFetch: null };
  const fakeQuery = (table) => {
    const q = {
      _table: table,
      select(cols) { this._cols = cols; return this; },
      eq(col, val) { this._eq = [col, val]; return this; },
      single() { return Promise.resolve({ data: impl.roleRow || null }); },
      then(res, rej) { return impl.tables[table](this).then(res, rej); },
    };
    calls.from.push(table);
    return q;
  };
  const fakeSb = { from: fakeQuery };
  /* PENTING: mock @supabase/supabase-js dipasang SEBELUM require(MOD) —
     createClient ditangkap modul saat load, bukan saat handler dipanggil. */
  const sbPath = require.resolve('@supabase/supabase-js');
  const realCreate = require.cache[sbPath];
  require.cache[sbPath] = {
    id: 'mock', filename: 'mock', loaded: true,
    exports: { createClient: () => fakeSb },
  };
  delete require.cache[require.resolve(MOD)];
  const mod = require(MOD);
  const realFetch = global.fetch;
  global.fetch = async (url, opts) => {
    calls.verifyFetch = { url: String(url), auth: opts?.headers?.Authorization };
    return impl.authUser
      ? { ok: true, json: async () => impl.authUser }
      : { ok: false, json: async () => ({}) };
  };
  return {
    mod, calls,
    restore() {
      global.fetch = realFetch;
      if (realCreate) require.cache[sbPath] = realCreate;
      else delete require.cache[sbPath];
    },
  };
}

const withEnv = (fn) => {
  const had = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY'].map(k => [k, k in process.env]);
  process.env.SUPABASE_URL = 'https://sb.example.com';
  process.env.SUPABASE_ANON_KEY = 'anon';
  process.env.SUPABASE_SERVICE_KEY = 'service';
  return Promise.resolve(fn()).finally(() => {
    had.forEach(([k, was]) => { if (was) delete process.env[k]; else process.env[k] = undefined; });
  });
};

const event = (overrides = {}) => ({
  httpMethod: 'GET',
  headers: { authorization: 'Bearer admin-token' },
  ...overrides,
});

const tests = [
  {
    name: 'tanpa konfigurasi: 501 NOT_CONFIGURED',
    fn: async () => {
      delete process.env.SUPABASE_SERVICE_KEY;
      const { mod, restore } = load({});
      try {
        const r = await mod.handler(event());
        assert.strictEqual(r.statusCode, 501);
        assert.ok(JSON.parse(r.body).code === 'NOT_CONFIGURED');
      } finally { restore(); }
    },
  },
  {
    name: 'tanpa token: 403',
    fn: () => withEnv(async () => {
      const { mod, restore } = load({ tables: {} });
      try {
        const r = await mod.handler(event({ headers: {} }));
        assert.strictEqual(r.statusCode, 403);
      } finally { restore(); }
    }),
  },
  {
    name: 'bukan admin: 403 (peran student)',
    fn: () => withEnv(async () => {
      const { mod, restore } = load({
        authUser: { id: 'u1', email: 's@x.io' },
        roleRow: { role: 'student' },
        tables: {},
      });
      try {
        const r = await mod.handler(event());
        assert.strictEqual(r.statusCode, 403);
      } finally { restore(); }
    }),
  },
  {
    name: 'admin sah: drift dihitung profil − log, diurutkan dari yang terbesar',
    fn: () => withEnv(async () => {
      const progress = [
        { user_id: 'a', xp: 500 },  // drift +200
        { user_id: 'b', xp: 90 },   // drift -10
        { user_id: 'c', xp: 75 },   // drift 0
      ];
      const log = [
        { user_id: 'a', xp_earned: 300 },
        { user_id: 'a', xp_earned: 0 },   // unapplied-ish nol tetap dihitung
        { user_id: 'b', xp_earned: 100 },
        { user_id: 'c', xp_earned: 75 },
        { user_id: 'd', xp_earned: 40 },  // log tanpa profil
      ];
      const { mod, restore, calls } = load({
        authUser: { id: 'admin1' },
        roleRow: { role: 'admin' },
        tables: {
          user_progress: () => Promise.resolve({ data: progress, error: null }),
          user_xp_log: () => Promise.resolve({ data: log, error: null }),
          user_roles: () => Promise.resolve({ data: { role: 'admin' }, error: null }),
        },
      });
      try {
        const r = await mod.handler(event());
        assert.strictEqual(r.statusCode, 200);
        const body = JSON.parse(r.body);
        assert.strictEqual(body.totalUsers, 4, 'a,b,c,d semua masuk');
        assert.strictEqual(body.driftedCount, 3, 'c drift nol tidak dihitung drifted');
        assert.deepStrictEqual(
          body.users.map(u => u.userId),
          ['a', 'd', 'b', 'c'],
          'urut |drift| turun: a(+200), d(+40), b(-10), c(0)'
        );
        const byId = Object.fromEntries(body.users.map(u => [u.userId, u]));
        assert.strictEqual(byId.a.drift, 200);
        assert.strictEqual(byId.b.drift, -10);
        assert.strictEqual(byId.d.profileXp, 0, 'tanpa profil: XP profil 0');
        assert.strictEqual(byId.d.hasLog, true);
        assert.strictEqual(body.users[0].email, undefined, 'email tidak pernah dikirim');
        assert.ok(calls.from.includes('user_roles'), 'peran dibaca dari user_roles');
      } finally { restore(); }
    }),
  },
  {
    name: 'METHOD selain GET: 405',
    fn: () => withEnv(async () => {
      const { mod, restore } = load({ tables: {} });
      try {
        const r = await mod.handler(event({ httpMethod: 'POST' }));
        assert.strictEqual(r.statusCode, 405);
      } finally { restore(); }
    }),
  },
];

module.exports = { tests };
